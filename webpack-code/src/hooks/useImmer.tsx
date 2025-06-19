import { Draft, produce, freeze } from 'immer';
import { useState, useCallback } from 'react';

// 这里的 Draft<S> 是 Immer 库中的类型，用于表示可变的草稿状态
export type DraftFunction<S> = (draft: Draft<S>) => void;

// Updater<S> 函数签名 接受一个参数 arg 类型是 S 或者 DraftFunction<S> 返回 void
export type Updater<S> = (arg: S | DraftFunction<S>) => void;
//返回一个元组类型 ImmerHook<S> 包含两个元素
export type ImmerHook<S> = [S, Updater<S>];
//函数签名 接受initialValue参数 类型是S  或者 () => S 返回 [state, setState]
export function useImmer<S = unknown>(initialValue: S | (() => S)): ImmerHook<S>;

/**
 * 通常的用法
 * setState(produce((draft) => {}))
 * userImmer: https://github.com/immerjs/use-immer/blob/master/src/index.ts
 * @param initialValue
 * @returns
 */
export function useImmer<T>(initialValue: T) {
  const [val, updateValue] = useState(
    freeze(typeof initialValue === 'function' ? initialValue() : initialValue, true),
  );
  return [
    val,
    useCallback((updater: T | DraftFunction<T>) => {
      if (typeof updater === 'function') {
        updateValue(produce(updater as DraftFunction<T>));
      } else {
        updateValue(freeze(updater));
      }
    }, []),
  ];
}
