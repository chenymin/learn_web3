# requestIdleCallback 详解

## 什么是 requestIdleCallback？

`requestIdleCallback` 是浏览器提供的 API，用于在浏览器空闲时执行任务。

### 浏览器的一帧（约 16.6ms = 60fps）

```
一帧的工作流程：
┌─────────────────────────────────────────────────┐
│ 1. 处理用户输入事件 (click, keypress)          │ ~1-2ms
├─────────────────────────────────────────────────┤
│ 2. 执行 JS (timers, event handlers)            │ ~3-5ms
├─────────────────────────────────────────────────┤
│ 3. requestAnimationFrame 回调                   │ ~1-2ms
├─────────────────────────────────────────────────┤
│ 4. 布局 Layout (重排 Reflow)                   │ ~2-3ms
├─────────────────────────────────────────────────┤
│ 5. 绘制 Paint (重绘 Repaint)                   │ ~3-5ms
├─────────────────────────────────────────────────┤
│ 6. 合成 Composite                               │ ~1-2ms
├─────────────────────────────────────────────────┤
│ 7. 【空闲时间】requestIdleCallback ← 在这执行！│ ~2-5ms
└─────────────────────────────────────────────────┘
总计：~16.6ms（一帧）
```

如果前面的工作太多，导致超过 16.6ms，就没有空闲时间了！
`requestIdleCallback` 会推迟到下一帧。

---

## 为什么有两个 requestIdleCallback？

### 代码分析

```javascript
// 第一次调用：启动工作循环
requestIdleCallback(workLoop);  // ← 46行：启动

function workLoop(deadline) {
  let shouldYield = false;

  // 处理一些工作单元
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  // 检查是否完成所有工作
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  // 第二次调用：递归调用自己
  requestIdleCallback(workLoop);  // ← 43行：持续循环
}
```

---

## 两次调用的作用

### 第一次（46行）：启动循环
```javascript
requestIdleCallback(workLoop);
```

**作用**：注册第一次回调，启动整个工作循环。

**时机**：脚本加载时立即执行（同步代码）。

**效果**：
- 浏览器空闲时，第一次调用 `workLoop`
- `deadline.timeRemaining()` 可能是 10ms

---

### 第二次（43行）：持续循环
```javascript
function workLoop(deadline) {
  // ... 处理工作

  // 再次注册自己
  requestIdleCallback(workLoop);  // ← 关键！
}
```

**作用**：保持工作循环一直运行。

**为什么需要？**
- `requestIdleCallback` 只执行一次回调
- 执行完后，如果不再次注册，循环就停止了
- 通过递归调用，实现持续的工作循环

---

## 详细执行流程

### 场景：渲染 100 个列表项

```javascript
// 初始状态
nextUnitOfWork = null;
wipRoot = null;

// 用户触发渲染
renderList();
  ↓
nextUnitOfWork = wipRoot;  // 设置了 100 个工作单元
```

---

### 第 1 帧（假设有 5ms 空闲时间）

```javascript
requestIdleCallback(workLoop);  // 第一次调用（46行）

// 浏览器空闲时执行
workLoop(deadline) {
  // deadline.timeRemaining() = 5ms

  while (nextUnitOfWork && shouldYield === false) {
    // 处理 Fiber 节点
    // 假设每个节点需要 1ms

    // 第 1 个：处理 root
    performUnitOfWork(root);  // 剩余 4ms

    // 第 2 个：处理 div
    performUnitOfWork(div);   // 剩余 3ms

    // 第 3 个：处理 ul
    performUnitOfWork(ul);    // 剩余 2ms

    // 第 4 个：处理 li[0]
    performUnitOfWork(li0);   // 剩余 1ms

    // 第 5 个：处理 li[1]
    performUnitOfWork(li1);   // 剩余 0ms

    // deadline.timeRemaining() < 1
    shouldYield = true;  // 时间不够了，让出控制权！
  }

  // 还有 95 个工作单元没处理完
  // nextUnitOfWork 不为 null

  // 再次注册，等待下一次空闲时间
  requestIdleCallback(workLoop);  // 第二次调用（43行）
}
```

**关键点**：
- 只处理了 5 个节点，还有 95 个
- 通过第二次调用，确保下一帧继续处理
- 浏览器可以先处理其他紧急任务（如用户输入）

---

### 第 2 帧（假设有 8ms 空闲时间）

```javascript
// 上一帧注册的回调被执行
workLoop(deadline) {
  // deadline.timeRemaining() = 8ms

  while (nextUnitOfWork && !shouldYield) {
    // 继续处理剩余的 95 个节点
    performUnitOfWork(li2);   // 处理第 6 个
    performUnitOfWork(li3);   // 处理第 7 个
    // ... 又处理了 8 个节点

    // deadline.timeRemaining() < 1
    shouldYield = true;
  }

  // 还有 87 个工作单元
  requestIdleCallback(workLoop);  // 继续下一帧
}
```

---

### 第 N 帧（所有工作完成）

```javascript
workLoop(deadline) {
  while (nextUnitOfWork && !shouldYield) {
    // 处理最后几个节点
    performUnitOfWork(li98);
    performUnitOfWork(li99);

    // nextUnitOfWork 变成 null（没有工作了）
  }

  // 检查：所有工作完成了！
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();  // 一次性提交到 DOM
  }

  // 虽然没有工作了，但还是注册下一次
  // 为了处理将来可能的更新
  requestIdleCallback(workLoop);  // 保持循环
}
```

**关键点**：
- 即使没有工作，也会保持循环
- 当用户再次点击按钮，`nextUnitOfWork` 会被重新设置
- 工作循环立即在下一次空闲时恢复

---

## 如果只有一次 requestIdleCallback 会怎样？

### ❌ 错误示例

```javascript
// 只在外部调用一次
requestIdleCallback(workLoop);

function workLoop(deadline) {
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  // 没有再次调用！
  // requestIdleCallback(workLoop);  ← 注释掉了
}
```

### 问题

```
第 1 帧：
  - 空闲时间 5ms
  - 处理 5 个节点
  - workLoop 执行完毕
  - 没有再次注册

第 2 帧：
  - 浏览器空闲
  - 没有回调可执行！← 工作循环停止了
  - 剩余 95 个节点永远不会被处理

结果：页面不更新，卡死！❌
```

---

## 可视化对比

### ✅ 正确：递归调用

```
时间线：
───────────────────────────────────────────────→

帧1    帧2    帧3    帧4    帧5
│     │     │     │     │
├─┐   ├─┐   ├─┐   ├─┐   ├─┐
│W│   │W│   │W│   │W│   │C│  W=workLoop, C=commitRoot
│o│   │o│   │o│   │o│   │o│
│r│   │r│   │r│   │r│   │m│
│k│   │k│   │k│   │k│   │m│
│L│→  │L│→  │L│→  │L│→  │i│
│o│   │o│   │o│   │o│   │t│
│o│   │o│   │o│   │o│   │ │
│p│   │p│   │p│   │p│   │ │
└─┘   └─┘   └─┘   └─┘   └─┘
 ↓     ↓     ↓     ↓
 处理  处理  处理  处理  提交
 5个   5个   5个   5个   到DOM
```

每次 `workLoop` 结束时，都会注册下一次回调。

---

### ❌ 错误：只调用一次

```
时间线：
───────────────────────────────────────────────→

帧1    帧2    帧3    帧4    帧5
│     │     │     │     │
├─┐
│W│   ❌    ❌    ❌    ❌
│o│   空    空    空    空
│r│   闲    闲    闲    闲
│k│   但    但    但    但
│L│   没    没    没    没
│o│   有    有    有    有
│o│   回    回    回    回
│p│   调    调    调    调
└─┘
 ↓
 只处理
 5个节点
 就停止了
```

---

## 为什么要保持循环？

### 1. 处理长任务（如你的代码）

```javascript
// 100 个列表项需要多帧处理
items = [1, 2, 3, ..., 100];

// 第 1 帧：处理 5 个
// 第 2 帧：处理 5 个
// ...
// 第 20 帧：处理完，提交 DOM
```

### 2. 响应未来的更新

```javascript
// 工作循环一直运行
requestIdleCallback(workLoop);

// 用户 3 秒后点击按钮
setTimeout(() => {
  items.push('新项目');
  renderList();  // 设置 nextUnitOfWork

  // 工作循环已经在运行，会在下一次空闲时处理
}, 3000);
```

如果没有持续循环，需要每次手动启动：
```javascript
// ❌ 不好的做法
function renderList() {
  // ...
  requestIdleCallback(workLoop);  // 每次都要重新启动
}
```

---

## React 真实源码的做法

React 不使用 `requestIdleCallback`，而是自己实现了调度器。

### 为什么？

1. **兼容性问题**：`requestIdleCallback` 在 Safari 不支持
2. **不够灵活**：无法设置优先级
3. **时机不好**：空闲时间可能在帧末尾，导致下一帧延迟

### React 的方案（Scheduler 包）

```javascript
// packages/scheduler/src/forks/Scheduler.js

let isMessageLoopRunning = false;
const channel = new MessageChannel();
const port = channel.port2;

channel.port1.onmessage = performWorkUntilDeadline;

function schedulePerformWorkUntilDeadline() {
  port.postMessage(null);  // 触发宏任务
}

function performWorkUntilDeadline() {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    // 自定义 deadline（5ms）
    deadline = currentTime + yieldInterval;

    const hasMoreWork = scheduledHostCallback(currentTime);

    if (hasMoreWork) {
      // 还有工作，继续下一轮
      schedulePerformWorkUntilDeadline();
    } else {
      isMessageLoopRunning = false;
    }
  }
}

// 启动循环
function requestHostCallback(callback) {
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}
```

**优势**：
- 使用 `MessageChannel` 替代 `requestIdleCallback`
- 更好的浏览器兼容性
- 可以自定义时间片（5ms）
- 可以设置任务优先级

---

## 总结

### 两次 requestIdleCallback 的作用

| 调用位置 | 作用 | 时机 |
|---------|------|------|
| **第 1 次（46行）** | 启动工作循环 | 脚本加载时 |
| **第 2 次（43行）** | 保持循环运行 | 每次 workLoop 执行完毕 |

### 为什么需要递归调用？

1. **处理大任务**：一帧时间不够，需要多帧处理
2. **可中断性**：让出控制权给浏览器
3. **持续响应**：随时准备处理新的更新

### 类比

```
requestIdleCallback 就像设置闹钟：

❌ 只设置一次：
  - 明天 8 点叫醒我
  - 第二天就没人叫了

✅ 递归调用：
  - 每天 8 点叫醒我
  - 每次醒来后，重新设置明天的闹钟
  - 形成持续循环
```

### 核心代码模式

```javascript
function workLoop(deadline) {
  // 1. 做一些工作（但不要做太久）
  while (hasWork && hasTime) {
    doWork();
  }

  // 2. 再次注册自己（保持循环）
  requestIdleCallback(workLoop);
}

// 3. 启动循环
requestIdleCallback(workLoop);
```

这就是 React Fiber 时间切片的核心机制！🎯
