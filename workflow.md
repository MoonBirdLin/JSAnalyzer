# 整体框架研究思路

## MDG(Module Dependency Graph) Analysis (Finished)
- 文件间根据关键字匹配构建的引入关系, 不涉及复杂程序分析
- MDG: 分析模块之间的依赖关系, 生成模块依赖图; 图结构为每个js文件的导入导出字典
  - 此后的 NameSpace 结构分析需要利用模块间依赖关系梳理
  - 基于模块依赖图, 可以有效减少大范围变量/函数重名的问题
- 根据跨模块引入的逻辑不同, 这个需要实现两个版本
  - ES6 Module: 通过 export 和 import 语法来实现
  - CommonJS(NodeJs) Module: 通过 module.exports 和 require 实现模块化
  - 由于测试用例来自微信 miniapp 以及 nodejs 工程, 优先实现 CommonJS Module 的模块化

## NameSpace Analysis
- 工作节点
  - [x] Scope 管理器
  - [x] NameSpace 管理器
  - [ ] 对象/变量重命名管理器
    - [x] 基本功能
    - [x] 未定义但是使用的变量默认在root被定义
    - [x] this 指针定义 & 使用
    - [x] 对象/类的各种 properties 的定义 & 使用不重命名
      - 定义: 定义对应的AST节点不进行重命名
      - 使用: 使用对应的AST节点一定是以this.xxx或者Class.xxx, 因此重命名只需要重命名对应的this/Class节点
    - [ ] var变量特性
  - [ ] 指针/对象初始化
- 一些设计思路
  - 思路
    - 整个NameSpace管理分为三块: 作用域 Scope 管理, NameSpace 关系管理, 对象/变量重命名管理
    - 这里还有一个暂时没有考虑的问题, 就是原型的问题, 当一个对象或一个类的原型发生变化时, 对象/函数的 NameSpace 会和实际运行时的 NameSpace 不一致, 需要考虑这个问题
      - 这里的合理性目前是一种直觉, 尚需验证和证明
      - 可以暂时不解决, 将这个问题遗留给数据流分析的部分来解决
      - 不解决的合理性: 当前的NameSpace无法完全映射到动态运行的时候, 这导致直接使用这个NameSpace进行数据流分析中的一些操作是不合理的(例如发生原型变更后的this指针问题???); 然而动态NameSpace的计算涉及到复杂程序内/程序间过程分析, 这种计算需要依赖一个已经计算好的NameSpace, 因此根据程序分析的常规思路(参考MPTA的表述), 在前置过程不解决
    - 作用域 Scope 管理: 
      - 各种分块作用域, 例如根节点/各种函数定义/各种控制流块...
      - 这里无需复杂分析, 直接遍历和记录节点即可; 主要目的是抽取各作用域以及作用域之间的关联性管理
    - NameSpace 关系管理: 依赖 Scope
      - 作用是根据 Scope 对每个 Scope 赋予一个NameSpace名, 并且记录各NameSpace之间的父子关系
      - 和对象/变量重命名管理相辅相成的一个接口是将每个NameSpace之中存在的对象/变量进行记录和分配
    - 对象/变量重命名管理: 依赖 NameSpace
      - 作用是管理各个对象所被分配的 NameSpace 以及新的 Name
      - ~~这里存在2个难点是~~
        1. AST中同一个变量在不同的地方被使用时没有明显代码关联性, 且在不同块之间可能存在变量重名, 因此进行分析时需要考虑NameSpace上下文确定变量最终指向(~~暂时还没有思路, def-use不能解决, 问题不具有同质性~~ 可以使用def-use解决)
        2. 在def-use分析中, 由于闭包和global变量的存在, 需要实现为一个def-use的变体, 也就是跨作用域的 def-use, 这种实现比起原始def-use定义实现更加复杂, 然而使用场景更少, 得找办法实现一个无错的方法(暂无思路)
      - 一个暂时无法证明的结论如下: 
        - 假设一个变量varl或一个对象obj被使用
          - 若该程序可以通过编译, 其定义/初始化一定存在于这一程序点前 -> 我们的分析对象是一个可运行的程序, 因此一定满足"通过编译"条件, 无需进行def-use分析也可以保证变量在使用前一定被定值
          - 若该程序可以通过编译, 其定义/初始化一定存在于当前作用域或某个祖先节点的作用域中 -> 对于跨作用域的变量/对象, 我们可以通过自底向上搜索NameSpace Tree来搜索其定义点
        - 总结这一结论的目的是解决上述基于def-use的方法中的第二个难点, 在"可通过编译"这一条件的限制下, 我们可以通过直接搜索NameSpace Tree来实现无数据流的分析被使用变量的定义点
      - 注意想办法处理var变量, 函数级作用域会导致重新定义的var变量跨作用域被使用
        - 一个解决思路是强制将var变量的NameSpace转换为函数级, 且对于var变量, 仅将其最早的一次出现视作定义, 之后的都是赋值
          - let先声明, var从编译角度就不能再声明
          - var先声明, 不同作用域里面let可以再声明但是作用域是块
          - 因此只需要从前向后先整理一张当前函数级作用域(文件或者一个函数)中的var变量就可以基于这个进行分析
      - 这里需要注意的一个事情是重命名的Identifier仅限变量和function, 不包括 field 和 method, 因为这两类在使用时与具体的对象相关, 重命名无法被传递
  - 流程:
    - 首先计算Scope, 即根据AST识别每一个作用域
    - 为每一个作用域取名(原本名字/为每个节点赋予的_id编号)
    - 接下来计算 NameSpace
    - 最后根据 NameSpace 对 对象/变量 进行重命名
    - 进行 对象/变量 - NameSpace 之间的 Re-check
- 单文件内部的程序分析, 以一个队列形式模拟递归即可; 最终生成命名空间图, 图结构为前缀树图(实现为字典)
  - 实现上可以参考JS代码混淆器的工作, 所以思路是借用 UglifyJS 的代码处理器, 重命名一遍代码, 使得全部重名变量被处理掉, 顺便从中把Scope抽取出来
    - JS代码混淆器一定需要保证翻译前后代码功能的一致性, 因此会准确地解析和处理命名空间以及变量作用域，以确保代码的执行语义不会被破坏。
- 设计理念来自于 Java/JVM 程序分析中的类
  - 在 Java/JVM 程序分析中, 全部的变量, 对象, 方法均归属于某个类; 因此可以通过类构建 Namespace 以此"天然地"区分同名变量
  - 例如 Soot 中, 对不同方法内的同名变量, 均有不同的内存地址; 因此可以避免一系列奇奇怪怪的变量/对象/方法同名导致分析目标不明的问题
- JavaScript 中需要特殊考虑的特性
  - var 变量的函数级作用域
  - ~~cluster 导致的局部变量长生命周期问题(不会影响namespace分析, 因为在进行namespace分析的时候cluster仅可能导致外部变量在内部被使用, 不会出现namespace"扩散"的现象)~~
  - 多层函数嵌套导致的长namespace前缀问题
- JavaScript v.s. Java
  - Root Node: 
    - Java: public class
    - JavaScript: js file
  - Variable prefix(Regex): A variable is defined as prefix + "$$" + variable name
    - Java: [class name]((None) | \$\$[method name])
    - JavaScript: [js file name](\$\$[(class name) | (object name) | (method name)])*
- var 变量重命名
  - 思路: 完全构建每一个namespace的def和use变量后, 实现一个作用域提升, 将var变量提升到函数级作用域, 并将每一个var变量的非函数级定义是为使用(即从def中删除)
    1. 从 AST 角度, var变量仅可在VariableDeclaration
    2. 从代码作用域角度, var变量仅存在函数级和模块级作用域
    3. 综上, 可以从每一个被定义类型为var的变量, 更新其作用域, 自底向上搜索到第一个函数级作用域即可
  - 实现

## Class Heritance Analysis
- 分析 Class/Interfece 的继承关系, 生成继承关系图(结构为字典)
  - 实现思路暂时不知道, 可能会GPT辅助先写一个简单版本
  - 难点: 要考虑prototype变更的情况...因此一个类/接口可能继承自多个类/接口

## Poninter Context
- MPTA Requirement:
  - 由于存在this指针分析难题, 按说需要一个 Object Context, 但是这又回到了死循环之中(分析指针->分析上下文->分析对象->分析指针), 且我们在进行MPTA的时候缺少一个基本的Object分析事实
  - 具体怎么搞还得再思考一下
  - ~~注意, 第一次执行MPTA的时候, 无法使用任何上下文, 因为此时还没有创建任何CallGraph~~
  - ~~因此我们使用一个 tradeoff, 即在分析MPTA时使用长度为1的Callsite上下文, 虽然这样this指针分析的对象会不准确, 但避免了粗糙的Object分析事实带来的精度损失~~
    - ~~长度为1的Callsite上下文的优势: 可以实现预计算, 赋予新上下文时, 不涉及当前函数所处调用链状态, 仅和当前所属函数相关;~~
- PTA Requirement:
  - 暂时不考虑, 沿用长度为1的Callsite上下文

## MPTA(Method Pointer Analysis)
- MPTA: 分析函数指针, 生成函数对象指向关系图
- 设计理念理念来自于 Java 中的反射机制
  - 在 Java 中为了实现对私有方法的访问, 或是同时调用新旧版本中的方法时, 使用反射(Reflection)机制动态地加载一个类, 并对类进行调整(例如setAccess)后实例化进行方法调用
    - 此处的启发就是, 对于函数/方法也成为一种对象时, 我们可以将其模拟为对Function Class的实例化并动态invoke了其中的方法(例如常见的各种回调类中的run方法)
  - 在 JavaScript 中, 由于"对象"这一概念的覆盖范围极广, 甚至连函数/方法也是一种对象
    - 因此可以参考反射机制, 在进行程序分析的过程中隐式的为其创建一个Function Class
    - 这映射在程序分析中, 即一套**有限命名空间内**的**过程间**静态分析, 其初步实现目前规划为一个**Anderson风格流不敏感指针分析变体**:
      - feature 的意义
        - 有限命名空间内: 尽可能减少分析范围, 一方面节省分析的内存和时间开销, 另一方面避免Anderson算法的不精确特性由于分析范围过大导致的错误大范围传播
        - 过程间: 由于 JavaScript 的 cluster, 函数作为对象等特性, MPTA 本质上是一个指针分析的变体问题, 因此是过程间的程序分析
        - Anderson风格流不敏感指针分析变体: 如上所述, 指针分析变体问题自然使用指针分析来实现
      - feature 的合理性:
        - 有限命名空间内: 
          - 由于在进行软件开发时的代码**时间和空间连续性**特征, 通常一个函数的调用不会跨越多个文件, 因此一个函数的调用链不会跨越多个文件
          - 因此我们可以使用一种启发式的方法来确定MPTA的处理范围, 即基于此前的 MDG 和 NameSpace 分析结果, 对 Model Dependence 深度以及 NameSpace 前缀长度进行加权评估, 在指针目标传播的位置进行剪枝
        - Anderson风格流不敏感指针分析变体:
          - 进行指针分析时一定存在一个"dead loop"式的问题, 也就是高精度的指针分析依赖Context(即方法/对象调用关系), 但是高精度的Context的有效计算依赖高精度的指针分析...
          - Java 指针分析相关工作的解决方案
            - 由于Soot珠玉在前, 进行Java程序分析时通常直接使用Soot, 此时对于 MDG 和 NameSpace 相关的等价实现已经存在, 即在进行 PTA 的时候基于 CHA 的 CG 是可以直接构建出的
            - Java 中的指针分析即基于一个较简单的CG构建context进而实现PTA, 解决分析入口(CHA -> PTA -> CG)问题
            - reference :
              - [QilinPTA/Qilin](https://github.com/QilinPTA/Qilin)
              - [conch](http://www.cse.unsw.edu.au/~corg/conch)
          - 然而在此处, 我们解决的是在 CHA 之前的问题; 因此我们使用一个有限范围的Anderson风格流不敏感指针分析实现对函数指针的简单分析, 使得我们在发现一个函数指针时可以找到其对应的函数体, 以此使得之后的步骤中我们可以实现出一个简易的CG构建, 接近于 Java 程序分析中的 CHA
  
- MPTA的实现方法
  1. 找到全部的函数/方法的创建程序位置, 为其分配一个虚假 Function Class 的实例(即记录)
     1. 这是一个流不敏感, 上下文不敏感的过程, 只需要查找全部的函数/方法创建 AST Node 即可
     2. 将全部定义函数(FunctionDeclaration)的 AST Node 加入进一个集合 DefineSet, 并为每一个AST Node分配一个唯一的 FunctionInstance ID
     3. 定义一个 Worklist, 用于存储用于指针分析的 AST Node
     4. 接下来迭代 DefineSet, 将以下几类 AST Node 加入 Worklist
        <!-- 目前先考虑这些 -->
        1. 若其中的 AST Node 属于一个 VariableDeclarator 的右值, 则将其所属的 VariableDeclarator 加入 Worklist
        2. 若其中的 AST Node 属于一个 AssignmentExpression 的右值, 则将其所属的 AssignmentExpression 加入 Worklist
        3. 若其中的 AST Node 属于一个 CallExpression 的参数, 则将其所属的 CallExpression 加入 Worklist
        <!-- 4. 若其中的 AST Node 属于一个 ReturnStatement 的右值, 则将其所属的 ReturnStatement 加入 Worklist -->
  2. 接下来迭代 Worklist, 对每一个 Worklist 中的 AST Node 进行处理
     1. 若其中的 AST Node 为 AssignmentExpression/VariableDeclarator, 且其右值为一个 FunctionDeclaration, 则将右值对应的 FunctionInstance ID 加入左值的指针集合
     2. 若其中的 AST Node 为 AssignmentExpression/VariableDeclarator, 且其右值为一个可计算指针集合的对象, 则将右值对应的指针集合加入左值的指针集合
        1. 可计算指针集合的对象指 Identifier(变量)/CallExpression(函数调用)/FunctionDeclaration(对象方法调用)/其他可以表示到一个对象上的表达式
        2. Identifier(变量)/对象 : 直接把右值的set复制给左值
        3. CallExpression(函数调用)/FunctionDeclaration(对象方法调用) : 检查现有指针表中调用的目标函数, 若存在则将目标函数所有 ReturnStatement 的参数的指针集合复制给左值
     3. 若其中的 AST Node 为 CallExpression
        1. 检查现有指针表中 CallExpression 的 target
        2. 检查有限命名空间特性: 
           1. (distanceMDG(caller, callee, MDGInstance) * weightMDG + distanceNameSpace(caller, callee, nameSpaceInstance) * weightNameSpace) < threshold, 若超出阈值则不做处理
        3. 将实参对应指针集合加入形参对应的指针集合
     4. 迭代上述流程知道经过某一次迭代后不再更新指针表
        1. 差分优化: 每次迭代后将指针表发生变化的变量相关的语句加入下一轮的迭代列表进行迭代
        <!-- 4. 若其中的 AST Node 为 ReturnStatement -->
- Reflection: MPTA 的作用
  1. MPTA 提供了函数对象的一种寻找策略, 比直接暴力匹配关键字更加精准
  2. MPTA 提供了一种函数指针和数据指针的区分方法, 也就是如果一个指针(变量, 对象等)是一个函数对象, 那么这个指针大概率(该结论出于经验性考量, 一般没有开发者会使用同一个变量在不同地方分别用于函数和数据)不是数据指针, 进行数据指针的数据流分析是可以直接作为filter跳过该指针

## Call Graph Analysis
- 基于 MPTA 的结果生成 CallGraph, 暂时不考虑上下文的情况, 直接使用 MPTA 的结果
  - 注意, 这种方法几乎等价于直接 CHA, 因为没有考虑对数据指针的指针分析