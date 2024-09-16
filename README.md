# JSAnalyzer

- 一个自实现的JS程序分析工具
- 设计理念参考[workflow.md](./workflow.md)

## Supported Functions

### MDG(Module Dependency Graph) Analysis
- MDG: 分析模块(文件)之间的依赖关系, 生成模块依赖图; 图结构为每个js文件的导入导出字典
- 根据根据跨模块引入的语法不同(Es6 or CommonJS), 存在可配置的两个版本的依赖图构建

### NameSpace Analysis
- 分析全部文件中的变量/对象/方法的命名空间, 最终生成命名空间图, 图结构为前缀树图(实现为字典)

### Class Heritance Analysis
- 分析 Class/Interfece 的继承关系, 生成继承关系图(结构为字典)

### MPTA(Method Pointer Analysis)
- MPTA: 分析函数指针, 生成函数对象指向关系图

### Call Graph Analysis
- 基于 MPTA 和 Inheritance Analysis 的结果生成 CallGraph

# References
- [cs-au-dk/jelly](https://github.com/cs-au-dk/jelly)
- [Swatinem/esgraph](https://github.com/Swatinem/esgraph)
- [Swatinem/analyses](https://github.com/Swatinem/analyses)
- [Song-Li/ODGen](https://github.com/Song-Li/ODGen)
- [CoCoAbstractInterpretation/CoCo](https://github.com/CoCoAbstractInterpretation/CoCo)
- [fast-sp-2023/fast](https://github.com/fast-sp-2023/fast)
- [SoheilKhodayari/JAW](https://github.com/SoheilKhodayari/JAW)
- [flyboss/MiniTracker](https://github.com/flyboss/MiniTracker)
- [sukyoung/safe](https://github.com/sukyoung/safe)
- [KTH-LangSec/silent-spring](https://github.com/KTH-LangSec/silent-spring) (仅包含一个CodeQL的查询Pipeline, 没有程序分析base上的内容)

# Reference Papers
- [Reducing Static Analysis Unsoundness with Approximate Interpretation](https://dl.acm.org/doi/pdf/10.1145/3656424)
- [Modular Call Graph Construction for Security Scanning of Node.js Applications](https://dl.acm.org/doi/pdf/10.1145/3460319.3464836)
- [Indirection-Bounded Call Graph Analysis](https://drops.dagstuhl.de/storage/00lipics/lipics-vol313-ecoop2024/LIPIcs.ECOOP.2024.10/LIPIcs.ECOOP.2024.10.pdf)
- [Practical Static Analysis of JavaScript Applications in the Presence of Frameworks and Libraries](https://dl.acm.org/doi/pdf/10.1145/2491411.2491417)
- [JAW: Studying Client-side CSRF with Hybrid Property Graphs and Declarative Traversals](https://www.usenix.org/system/files/sec21-khodayari.pdf)