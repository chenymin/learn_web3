# React Fiber 运行原理详解

## 核心概念

### 1. Fiber 是什么？
Fiber 是一个 JavaScript 对象，代表了一个工作单元（work unit）。每个 Fiber 对应一个 React 元素。

```javascript
fiber = {
  type: 'div',           // 元素类型
  props: { ... },        // 属性（包含 children）
  dom: DOMNode,          // 对应的真实 DOM 节点
  parent: fiber,         // 父 Fiber
  child: fiber,          // 第一个子 Fiber
  sibling: fiber,        // 兄弟 Fiber
  alternate: fiber,      // 上一次渲染的 Fiber（用于对比）
  effectTag: 'UPDATE'    // 操作类型：PLACEMENT/UPDATE/DELETION
}
```

### 2. Fiber 树结构

```
        div (root)
         |
    ┌────┴────┐
    h2        ul
              |
         ┌────┼────┐
        li   li   li
         |    |    |
      text text text
```

通过 `child` 指向第一个子节点，`sibling` 指向兄弟节点，`parent` 指向父节点。

---

## 运行流程

### 阶段 1：初始化渲染

```javascript
// 用户调用
renderList();
  ↓
Didact.render(App(), document.getElementById('root'));
  ↓
// 创建 wipRoot（work in progress root）
wipRoot = {
  dom: document.getElementById('root'),
  props: { children: [App()] },
  alternate: null  // 第一次渲染，没有旧的
}
nextUnitOfWork = wipRoot;  // 设置下一个工作单元
```

### 阶段 2：浏览器空闲时循环工作 (workLoop)

```javascript
requestIdleCallback(workLoop);

function workLoop(deadline) {
  // deadline.timeRemaining() 返回当前帧剩余时间（毫秒）

  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    // 处理一个工作单元
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  // 所有工作完成，且有待提交的根节点
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();  // 提交到 DOM
  }

  // 继续下一帧
  requestIdleCallback(workLoop);
}
```

**关键点**：
- 使用 `requestIdleCallback` 在浏览器空闲时执行
- 每次只处理一小部分工作，避免阻塞主线程
- 可中断、可恢复

### 阶段 3：执行工作单元 (performUnitOfWork)

```javascript
function performUnitOfWork(fiber) {
  // 1. 创建 DOM 节点（如果还没有）
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber);
  }

  // 2. 协调子节点（diff 算法）
  const elements = fiber.props.children || [];
  reconcileChildren(fiber, elements);

  // 3. 返回下一个工作单元（深度优先遍历）
  // 优先级：child > sibling > uncle

  if (fiber.child) {
    return fiber.child;  // 先处理子节点
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;  // 再处理兄弟节点
    }
    nextFiber = nextFiber.parent;  // 向上返回
  }
}
```

**遍历顺序示例**：
```
     1:div
       |
   ┌───┴───┐
   2:h2   5:ul
   |       |
   3:text ┌┴──┐
          6:li 8:li
          |    |
          7:t  9:t
```

### 阶段 4：协调子节点 (reconcileChildren) - Diff 算法

这是 React 的核心！对比新旧节点，决定如何更新：

```javascript
function reconcileChildren(wipFiber, elements) {
  let oldFiber = wipFiber.alternate?.child;  // 上一次的子节点
  let index = 0;

  while (index < elements.length || oldFiber) {
    const element = elements[index];
    const sameType = oldFiber && element &&
                     oldFiber.type === element.type;

    let newFiber = null;

    // 情况 1：类型相同 → 更新
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,      // 复用旧 DOM
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE'     // 标记为更新
      };
    }

    // 情况 2：有新元素且类型不同 → 新增
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,              // 新 DOM
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT'  // 标记为新增
      };
    }

    // 情况 3：有旧元素但没有对应新元素 → 删除
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION';
      deletion.push(oldFiber);  // 加入删除队列
    }

    // 构建 Fiber 链表
    if (index === 0) {
      wipFiber.child = newFiber;     // 第一个子节点
    } else if (newFiber) {
      prevSibling.sibling = newFiber; // 兄弟节点
    }

    oldFiber = oldFiber?.sibling;
    index++;
  }
}
```

**Diff 示例**：
```
旧：['🍎', '🍌', '🍇']
新：['🍎', '🥝', '🍇']

结果：
  🍎 → UPDATE（类型相同，props 相同）
  🍌 → DELETION（被移除）
  🥝 → PLACEMENT（新增）
  🍇 → UPDATE（类型相同）
```

### 阶段 5：提交到 DOM (commitRoot)

当所有工作单元处理完毕，一次性提交所有更改：

```javascript
function commitRoot() {
  // 1. 先处理删除操作
  deletion.forEach(commitWork);

  // 2. 处理新增和更新
  commitWork(wipRoot.child);

  // 3. 保存当前 Fiber 树，用于下次对比
  currentRoot = wipRoot;
  wipRoot = null;
  deletion = [];
}

function commitWork(fiber) {
  if (!fiber) return;

  // 查找有 DOM 的父节点
  let parentFiber = fiber.parent;
  while (!parentFiber.dom) {
    parentFiber = parentFiber.parent;
  }
  const parentDom = parentFiber.dom;

  switch (fiber.effectTag) {
    case 'PLACEMENT':
      // 新增：插入 DOM + 绑定事件
      parentDom.append(fiber.dom);
      updateDOM(fiber.dom, {}, fiber.props);
      break;

    case 'UPDATE':
      // 更新：对比并更新属性/事件
      updateDOM(fiber.dom, fiber.alternate.props, fiber.props);
      break;

    case 'DELETION':
      // 删除：从 DOM 中移除
      parentDom.removeChild(fiber.dom);
      return;
  }

  // 递归处理子节点和兄弟节点
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
```

### 阶段 6：更新 DOM 属性和事件 (updateDOM)

```javascript
function updateDOM(dom, prevProps, nextProps) {
  // 1. 移除旧事件
  Object.keys(prevProps)
    .filter(key => key.startsWith('on'))
    .filter(key => !(key in nextProps) ||
                   prevProps[key] !== nextProps[key])
    .forEach(key => {
      const eventType = key.slice(2).toLowerCase(); // onClick → click
      dom.removeEventListener(eventType, prevProps[key]);
    });

  // 2. 添加新事件
  Object.keys(nextProps)
    .filter(key => key.startsWith('on'))
    .filter(key => prevProps[key] !== nextProps[key])
    .forEach(key => {
      const eventType = key.slice(2).toLowerCase();
      dom.addEventListener(eventType, nextProps[key]);
    });

  // 3. 移除旧属性
  Object.keys(prevProps)
    .filter(key => key !== 'children' && !key.startsWith('on'))
    .filter(key => !(key in nextProps))
    .forEach(key => {
      dom[key] = '';
    });

  // 4. 设置新属性
  Object.keys(nextProps)
    .filter(key => key !== 'children' && !key.startsWith('on'))
    .filter(key => prevProps[key] !== nextProps[key])
    .forEach(key => {
      dom[key] = nextProps[key];
    });
}
```

---

## 完整流程示例：点击 "Add Item"

### 1. 用户点击按钮
```javascript
items.push('🥝 Kiwi #1234567890');
renderList();
```

### 2. 创建新的 wipRoot
```javascript
wipRoot = {
  dom: root,
  props: { children: [App()] },
  alternate: currentRoot  // 指向上一次的 Fiber 树
}
nextUnitOfWork = wipRoot;
```

### 3. 浏览器空闲时开始 work
```
workLoop 开始
  ↓
performUnitOfWork(root)
  ↓
reconcileChildren(root, [div])
  → 对比旧的 div，类型相同，标记 UPDATE
  ↓
performUnitOfWork(div)
  ↓
reconcileChildren(div, [h2, button, button, ul])
  → h2: UPDATE
  → button1: UPDATE
  → button2: UPDATE
  → ul: UPDATE
  ↓
performUnitOfWork(ul)
  ↓
reconcileChildren(ul, [li, li, li, li])  // 4 个 li 了！
  → li1: UPDATE (🍎)
  → li2: UPDATE (🍌)
  → li3: UPDATE (🍇)
  → li4: PLACEMENT (🥝) ← 新增的！
```

### 4. 提交到 DOM
```javascript
commitRoot()
  ↓
commitWork(div)
  → effectTag: UPDATE
  → updateDOM(div, oldProps, newProps)
  ↓
commitWork(ul)
  → effectTag: UPDATE
  ↓
commitWork(li4)  // 新增的 li
  → effectTag: PLACEMENT
  → parentDom.append(li4.dom)
  → updateDOM(li4.dom, {}, newProps)  // 绑定事件
```

### 5. 浏览器重新渲染
用户看到列表中出现了新的 🥝 Kiwi！

---

## 关键优势

### 1. 可中断渲染
```javascript
while (nextUnitOfWork && deadline.timeRemaining() > 1) {
  // 如果时间不够，停止工作
  // 下一帧继续
}
```

### 2. 时间切片
每个 `performUnitOfWork` 只处理一个 Fiber 节点，工作量很小，不会阻塞主线程。

### 3. 双缓冲技术
- `currentRoot`：当前显示的 Fiber 树
- `wipRoot`：正在构建的 Fiber 树
- 构建完成后，一次性切换

### 4. 增量更新
通过 `alternate` 链接新旧 Fiber，实现高效 diff。

---

## 与传统 React 的区别

### 传统 React（递归）
```javascript
function render(element) {
  const dom = createDOM(element);
  element.children.forEach(child => {
    render(child);  // 递归，无法中断
  });
  parent.appendChild(dom);
}
```
**问题**：递归无法中断，如果组件树很大，会长时间阻塞主线程。

### Fiber（循环）
```javascript
while (nextUnitOfWork && hasTime) {
  nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  // 可以随时停止，下次继续
}
```
**优势**：可中断、可恢复、可设置优先级。

---

## 总结

React Fiber 的核心思想：
1. **化整为零**：把渲染任务拆分成小的工作单元
2. **时间切片**：利用浏览器空闲时间，避免阻塞
3. **双缓冲**：在内存中构建新树，完成后一次性提交
4. **增量更新**：通过 diff 算法，只更新变化的部分

这使得 React 能够：
- 在渲染大型应用时保持流畅
- 暂停、中止或重用工作
- 为不同类型的更新分配优先级
- 支持并发模式（Concurrent Mode）
