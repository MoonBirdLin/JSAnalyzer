# JSAnalyzer

- 一个自实现的JS程序分析工具
- 设计理念参考[workflow.md](./workflow.md)

## Supported Functions

### MDG(Module Dependency Graph) Analysis
- MDG: 分析模块(文件)之间的依赖关系, 生成模块依赖图; 图结构为每个js文件的导入导出字典
- 根据根据跨模块引入的语法不同(Es6 or CommonJS), 存在可配置的两个版本的依赖图构建

### NameSpace Analysis
- 分析全部文件中的变量/对象/方法的命名空间, 最终生成命名空间图, 图结构为前缀树图(实现为字典)

### Inheritance Analysis
- 分析 Class/Interfece 的继承关系, 生成继承关系图(结构为字典)

### MPTA(Method Pointer Analysis)
- MPTA: 分析函数指针, 生成函数对象指向关系图

### Call Graph Analysis
- 基于 MPTA 和 Inheritance Analysis 的结果生成 CallGraph

# References
- [Song-Li/ODGen](https://github.com/Song-Li/ODGen)
- [CoCoAbstractInterpretation/CoCo](https://github.com/CoCoAbstractInterpretation/CoCo)
- [fast-sp-2023/fast](https://github.com/fast-sp-2023/fast)
- [SoheilKhodayari/JAW](https://github.com/SoheilKhodayari/JAW)
- [flyboss/MiniTracker](https://github.com/flyboss/MiniTracker)
- [sukyoung/safe](https://github.com/sukyoung/safe)