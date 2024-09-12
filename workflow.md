# 整体框架研究思路

## MDG(Module Dependency Graph) Analysis
- 文件间根据关键字匹配构建的引入关系, 不涉及复杂程序分析
- MDG: 分析模块之间的依赖关系, 生成模块依赖图; 图结构为每个js文件的导入导出字典
  - 此后的 NameSpace 结构分析需要利用模块间依赖关系梳理
  - 基于模块依赖图, 可以有效减少大范围变量/函数重名的问题
- 根据跨模块引入的逻辑不同, 这个需要实现两个版本
  - ES6 Module: 通过 export 和 import 语法来实现
  - CommonJS(NodeJs) Module: 通过 module.exports 和 require 实现模块化
  - 由于测试用例来自微信 miniapp 以及 nodejs 工程, 优先实现 CommonJS Module 的模块化

## NameSpace Analysis
- 单文件内部的程序分析, 以一个队列形式模拟递归即可; 最终生成命名空间图, 图结构为前缀树图(实现为字典)
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

## Class Heritance Analysis
- 分析 Class/Interfece 的继承关系, 生成继承关系图(结构为字典)
  - 实现思路暂时不知道, 可能会GPT辅助先写一个简单版本
  - 难点: 要考虑prototype变更的情况...因此一个类/接口可能继承自多个类/接口

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