# React Fiber 简化实现 vs React 真实源码对比

## 相同的核心概念 ✅

### 1. Fiber 数据结构
**简化版**：
```javascript
fiber = {
  type, props, dom,
  parent, child, sibling,
  alternate, effectTag
}
```

**React 源码**（packages/react-reconciler/src/ReactInternalTypes.js）：
```javascript
type Fiber = {
  // 实例相关
  tag: WorkTag,                    // 标识 Fiber 类型
  key: null | string,
  elementType: any,
  type: any,
  stateNode: any,                  // 对应的 DOM 节点或组件实例

  // Fiber 树结构（一样！）
  return: Fiber | null,            // 父节点（我们叫 parent）
  child: Fiber | null,
  sibling: Fiber | null,
  index: number,

  // 数据
  ref: null | (((handle: mixed) => void) & {_stringRef: ?string}) | RefObject,
  pendingProps: any,
  memoizedProps: any,              // 上次渲染的 props
  updateQueue: mixed,              // 更新队列
  memoizedState: any,              // Hook 状态链表

  // Effects（副作用）
  flags: Flags,                    // 我们的 effectTag
  subtreeFlags: Flags,
  deletions: Array<Fiber> | null,  // 我们的 deletion 数组

  // 双缓冲（一样！）
  alternate: Fiber | null,         // 指向另一棵树的对应节点

  // 调度优先级
  lanes: Lanes,                    // 我们没实现
  childLanes: Lanes,

  // ... 其他字段
};
```

**结论**：核心结构是一样的！但 React 源码有更多字段用于：
- Hook 状态管理（memoizedState）
- 优先级调度（lanes）
- 更新队列（updateQueue）
- 性能优化（subtreeFlags）

---

### 2. 工作循环 (workLoop)

**简化版**：
```javascript
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}
```

**React 源码**（packages/react-reconciler/src/ReactFiberWorkLoop.js）：
```javascript
function workLoopConcurrent() {
  // Perform work until Scheduler asks us to yield
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}

function shouldYield() {
  const currentTime = now();
  if (currentTime >= deadline) {
    // 检查是否有更高优先级任务
    // 检查是否需要中断
    return true;
  }
  return false;
}
```

**结论**：逻辑完全一样！区别在于：
- React 使用 Scheduler 包管理时间切片（而不是 requestIdleCallback）
- React 支持优先级调度（紧急更新可以打断普通更新）

---

### 3. 协调子节点 (reconcileChildren)

**简化版**：
```javascript
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate?.child;
  let prevSibling = null;

  while (index < elements.length || oldFiber) {
    const element = elements[index];
    const sameType = oldFiber && element &&
                     oldFiber.type === element.type;

    if (sameType) {
      // UPDATE
      newFiber = { ..., effectTag: 'UPDATE' };
    }
    if (element && !sameType) {
      // PLACEMENT
      newFiber = { ..., effectTag: 'PLACEMENT' };
    }
    if (oldFiber && !sameType) {
      // DELETION
      oldFiber.effectTag = 'DELETION';
      deletion.push(oldFiber);
    }

    // 构建链表
    if (index === 0) {
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    oldFiber = oldFiber?.sibling;
    index++;
  }
}
```

**React 源码**（packages/react-reconciler/src/ReactChildFiber.js）：
```javascript
function reconcileChildrenArray(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  newChildren: Array<any>,
  lanes: Lanes,
): Fiber | null {
  let resultingFirstChild: Fiber | null = null;
  let previousNewFiber: Fiber | null = null;
  let oldFiber = currentFirstChild;
  let newIdx = 0;

  // 1. 从左到右遍历，处理相同 key 的节点
  for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
    if (oldFiber.index > newIdx) {
      nextOldFiber = oldFiber;
      oldFiber = null;
    } else {
      nextOldFiber = oldFiber.sibling;
    }

    const newFiber = updateSlot(
      returnFiber,
      oldFiber,
      newChildren[newIdx],
      lanes,
    );

    if (newFiber === null) {
      if (oldFiber === null) {
        oldFiber = nextOldFiber;
      }
      break;
    }

    // 判断是移动还是新增
    if (shouldTrackSideEffects) {
      if (oldFiber && newFiber.alternate === null) {
        deleteChild(returnFiber, oldFiber);
      }
    }

    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

    // 构建链表
    if (previousNewFiber === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
    oldFiber = nextOldFiber;
  }

  // 2. 处理剩余的新节点（插入）
  if (newIdx === newChildren.length) {
    deleteRemainingChildren(returnFiber, oldFiber);
    return resultingFirstChild;
  }

  // 3. 处理剩余的旧节点（删除）
  if (oldFiber === null) {
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
      // ...
    }
    return resultingFirstChild;
  }

  // 4. 处理复杂情况：使用 Map 优化查找
  const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

  for (; newIdx < newChildren.length; newIdx++) {
    const newFiber = updateFromMap(
      existingChildren,
      returnFiber,
      newIdx,
      newChildren[newIdx],
      lanes,
    );
    // ...
  }

  // 5. 删除 Map 中未使用的旧节点
  if (shouldTrackSideEffects) {
    existingChildren.forEach(child => deleteChild(returnFiber, child));
  }

  return resultingFirstChild;
}
```

**结论**：
- ✅ **核心逻辑一样**：对比新旧节点，标记 UPDATE/PLACEMENT/DELETION
- ❌ **简化版缺失**：
  - **key 优化**：React 用 key 高效查找可复用节点
  - **多轮 diff**：React 有 5 个阶段的优化策略
  - **位置追踪**：React 追踪节点移动，最小化 DOM 操作

---

## 主要区别 ❌

### 1. Key 的处理

**简化版**：
```javascript
// 只比较 type，忽略 key
const sameType = oldFiber.type === element.type;
```

**React 源码**：
```javascript
// 先比较 key，再比较 type
if (oldFiber.key === newChild.key) {
  if (oldFiber.elementType === newChild.type) {
    // 可以复用
  }
}

// 使用 Map 优化查找
const existingChildren = new Map();
let existingChild = currentFirstChild;
while (existingChild !== null) {
  if (existingChild.key !== null) {
    existingChildren.set(existingChild.key, existingChild);
  } else {
    existingChildren.set(existingChild.index, existingChild);
  }
  existingChild = existingChild.sibling;
}
```

**影响**：
```javascript
// 数组重新排序
旧：[A(key=1), B(key=2), C(key=3)]
新：[C(key=3), A(key=1), B(key=2)]

// 简化版：全部删除 + 重建（因为位置不同）
// React 源码：识别出是移动，复用 DOM 节点
```

---

### 2. 优先级调度

**简化版**：
```javascript
// 没有优先级概念，所有更新平等对待
nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
```

**React 源码**：
```javascript
// 每个更新都有优先级
export const NoLanes: Lanes = 0b0000000000000000000000000000000;
export const SyncLane: Lane = 0b0000000000000000000000000000001;
export const InputContinuousLane: Lane = 0b0000000000000000000000000000100;
export const DefaultLane: Lane = 0b0000000000000000000000000010000;

function ensureRootIsScheduled(root: FiberRoot) {
  const nextLanes = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes);

  // 高优先级更新打断低优先级更新
  if (nextLanes === SyncLane) {
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
  } else {
    scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root),
    );
  }
}
```

**影响**：
```javascript
// 场景：用户正在输入，同时有大量数据渲染

// 简化版：输入会卡顿（因为要等数据渲染完）

// React 源码：
// 1. 输入事件（高优先级）打断数据渲染（低优先级）
// 2. 先处理输入，保持响应
// 3. 再恢复数据渲染
```

---

### 3. 函数组件和 Hooks

**简化版**：
```javascript
// 不支持函数组件和 Hooks
```

**React 源码**：
```javascript
// FunctionComponent 有专门的处理逻辑
function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes,
) {
  // 准备 Hook 环境
  prepareToReadContext(workInProgress, renderLanes);

  // 执行函数组件
  let nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    nextProps,
    context,
    renderLanes,
  );

  // 协调子节点
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

// Hook 状态存储在 Fiber.memoizedState 链表中
fiber.memoizedState = {
  hook1: { memoizedState: value1, next: hook2 },
  hook2: { memoizedState: value2, next: hook3 },
  // ...
};
```

---

### 4. Context 和 Provider

**简化版**：
```javascript
// 不支持 Context
```

**React 源码**：
```javascript
// Context 有专门的 Fiber tag
const ContextProvider = 10;
const ContextConsumer = 11;

function updateContextProvider(current, workInProgress, renderLanes) {
  const providerType: ReactProviderType<any> = workInProgress.type;
  const context: ReactContext<any> = providerType._context;

  const newProps = workInProgress.pendingProps;
  const oldProps = workInProgress.memoizedProps;

  const newValue = newProps.value;

  // 推送新的 context 值
  pushProvider(workInProgress, context, newValue);

  if (oldProps !== null) {
    const oldValue = oldProps.value;
    if (is(oldValue, newValue)) {
      // Context 值没变，可以跳过子树
      if (oldProps.children === newProps.children) {
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
      }
    } else {
      // Context 值改变，标记所有消费者需要更新
      propagateContextChange(workInProgress, context, renderLanes);
    }
  }

  const newChildren = newProps.children;
  reconcileChildren(current, workInProgress, newChildren, renderLanes);
  return workInProgress.child;
}
```

---

### 5. 错误边界

**简化版**：
```javascript
// 不支持错误捕获
```

**React 源码**：
```javascript
function handleError(root, thrownValue): void {
  do {
    let erroredWork = workInProgress;
    try {
      // 重置模块级状态
      resetContextDependencies();
      resetHooksAfterThrow();

      // 向上查找错误边界
      throwException(
        root,
        erroredWork.return,
        erroredWork,
        thrownValue,
        workInProgressRootRenderLanes,
      );

      // 从错误边界继续渲染
      completeUnitOfWork(erroredWork);
    } catch (yetAnotherThrownValue) {
      // 错误边界本身也抛错了，继续向上查找
      thrownValue = yetAnotherThrownValue;
      continue;
    }
    return;
  } while (true);
}

// ClassComponent 可以定义错误边界
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logErrorToService(error, errorInfo);
  }
}
```

---

### 6. Suspense 和异步渲染

**简化版**：
```javascript
// 不支持 Suspense
```

**React 源码**：
```javascript
function updateSuspenseComponent(current, workInProgress, renderLanes) {
  const nextProps = workInProgress.pendingProps;

  let suspenseContext: SuspenseContext = suspenseStackCursor.current;

  let showFallback = false;
  const didSuspend = (workInProgress.flags & DidCapture) !== NoFlags;

  if (didSuspend || shouldRemainOnFallback(suspenseContext, current)) {
    // 显示 fallback（加载中状态）
    showFallback = true;
    workInProgress.flags &= ~DidCapture;
  }

  if (current === null) {
    // 首次渲染
    const nextPrimaryChildren = nextProps.children;
    const nextFallbackChildren = nextProps.fallback;

    if (showFallback) {
      // 渲染 fallback
      return mountSuspenseFallbackChildren(
        workInProgress,
        nextPrimaryChildren,
        nextFallbackChildren,
        renderLanes,
      );
    } else {
      // 渲染实际内容
      return mountSuspensePrimaryChildren(workInProgress, nextPrimaryChildren, renderLanes);
    }
  } else {
    // 更新
    // ...处理从 fallback 切换到内容，或反之
  }
}

// 组件抛出 Promise 时触发 Suspense
function throwException(root, returnFiber, sourceFiber, value, rootRenderLanes) {
  if (value !== null && typeof value === 'object' && typeof value.then === 'function') {
    // 这是一个 Promise（thenable）
    const wakeable: Wakeable = (value: any);

    // 向上查找 Suspense 边界
    let suspenseBoundary = returnFiber;
    do {
      if (suspenseBoundary.tag === SuspenseComponent) {
        // 找到了！附加 wakeable
        attachPingListener(root, wakeable, rootRenderLanes);
        suspenseBoundary.flags |= ShouldCapture;
        return;
      }
      suspenseBoundary = suspenseBoundary.return;
    } while (suspenseBoundary !== null);
  }
}
```

---

### 7. Batching（批处理更新）

**简化版**：
```javascript
// 每次 render() 都立即开始新的渲染
function render(element, container) {
  wipRoot = { ... };
  nextUnitOfWork = wipRoot;
}
```

**React 源码**：
```javascript
// 自动批处理多个 setState
function batchedUpdates<A, R>(fn: (a: A) => R, a: A): R {
  const prevExecutionContext = executionContext;
  executionContext |= BatchedContext;
  try {
    return fn(a);
  } finally {
    executionContext = prevExecutionContext;
    // 批处理结束，一次性处理所有更新
    if (executionContext === NoContext) {
      flushSyncCallbackQueue();
    }
  }
}

// React 18 自动批处理（包括异步回调）
onClick={() => {
  setCount(c => c + 1);  // 不会立即渲染
  setFlag(f => !f);      // 不会立即渲染
  // 两个更新合并为一次渲染
}}

setTimeout(() => {
  setCount(c => c + 1);  // React 18: 也会批处理
  setFlag(f => !f);      // React 17: 会分两次渲染
}, 1000);
```

---

### 8. 性能优化

**简化版**：
```javascript
// 没有优化，每次都会遍历整棵树
while (nextUnitOfWork) {
  nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
}
```

**React 源码**：
```javascript
// 1. bailout 优化（跳过没变化的子树）
function bailoutOnAlreadyFinishedWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  if (current !== null) {
    workInProgress.dependencies = current.dependencies;
  }

  // 检查子树是否需要更新
  if (!includesSomeLane(renderLanes, workInProgress.childLanes)) {
    // 子树完全不需要更新，跳过！
    return null;
  }

  // 子树有更新，克隆子节点继续处理
  cloneChildFibers(current, workInProgress);
  return workInProgress.child;
}

// 2. memo 优化
const MemoComponent = React.memo(function MyComponent(props) {
  // 只在 props 改变时重新渲染
});

// 3. useMemo/useCallback 优化
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);
```

---

## 总结对比

| 特性 | 简化版 | React 源码 |
|------|--------|-----------|
| **Fiber 数据结构** | ✅ 核心字段一致 | ✅ 更多字段（Hook、优先级、更新队列） |
| **双缓冲 alternate** | ✅ 完全一致 | ✅ 完全一致 |
| **workLoop 循环** | ✅ 逻辑一致 | ✅ 更复杂的调度器 |
| **时间切片** | ✅ requestIdleCallback | ✅ Scheduler 包 + MessageChannel |
| **reconcileChildren** | ✅ 基本一致 | ✅ 多轮优化 + key 复用 |
| **effectTag/flags** | ✅ UPDATE/PLACEMENT/DELETION | ✅ 30+ 种 flags |
| **commitRoot** | ✅ 基本一致 | ✅ 多阶段提交（before/mutation/layout） |
| **key 优化** | ❌ 不支持 | ✅ Map 优化查找 |
| **优先级调度** | ❌ 不支持 | ✅ Lane 模型（31 个优先级） |
| **函数组件** | ❌ 不支持 | ✅ 完整支持 |
| **Hooks** | ❌ 不支持 | ✅ useState/useEffect/... |
| **Context** | ❌ 不支持 | ✅ Provider/Consumer |
| **错误边界** | ❌ 不支持 | ✅ ErrorBoundary |
| **Suspense** | ❌ 不支持 | ✅ 异步渲染 |
| **批处理** | ❌ 不支持 | ✅ 自动批处理 |
| **性能优化** | ❌ 不支持 | ✅ bailout/memo/useMemo |

---

## 结论

### ✅ 简化版实现了什么？
1. **Fiber 架构的核心**：数据结构、双缓冲、可中断渲染
2. **基本 Diff 算法**：对比新旧节点，标记操作类型
3. **DOM 更新**：属性对比、事件绑定

### ❌ 简化版缺少什么？
1. **Key 优化**：无法高效处理列表重排
2. **优先级调度**：无法处理紧急更新
3. **组件系统**：不支持函数组件、类组件、Hooks
4. **高级特性**：Context、Suspense、错误边界
5. **性能优化**：bailout、memo、子树跳过

### 📚 学习价值
**简化版非常适合理解 React Fiber 的核心思想**：
- Fiber 是什么？为什么需要它？
- 时间切片如何工作？
- Diff 算法的基本逻辑
- 双缓冲技术

**如果要深入学习，建议阅读 React 源码**：
- `packages/react-reconciler/src/ReactFiberWorkLoop.js` - 工作循环
- `packages/react-reconciler/src/ReactChildFiber.js` - Diff 算法
- `packages/react-reconciler/src/ReactFiberHooks.js` - Hooks 实现
- `packages/scheduler/src/forks/Scheduler.js` - 调度器

---

## 推荐学习路径

1. ✅ **先理解简化版**（你现在的代码）
   - 掌握 Fiber 架构的核心概念
   - 理解可中断渲染的原理

2. 📖 **阅读 React 文档**
   - 官方博客：[React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)
   - [Inside Fiber: in-depth overview](https://indepth.dev/posts/1008/inside-fiber-in-depth-overview-of-the-new-reconciliation-algorithm-in-react)

3. 🔬 **调试 React 源码**
   - Clone React 仓库
   - 在关键函数打断点
   - 观察 Fiber 树的构建过程

4. 💪 **扩展简化版**
   - 添加 key 支持
   - 实现简单的函数组件
   - 实现 useState Hook

你已经掌握了 Fiber 的核心！🎉
