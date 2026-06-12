export type HistoryState<TState> = {
  past: TState[];
  present: TState;
  future: TState[];
};

export function createHistoryState<TState>(present: TState): HistoryState<TState> {
  return {
    past: [],
    present,
    future: [],
  };
}

export function canUndo<TState>(history: HistoryState<TState>) {
  return history.past.length > 0;
}

export function canRedo<TState>(history: HistoryState<TState>) {
  return history.future.length > 0;
}

export function commitHistoryState<TState>(
  history: HistoryState<TState>,
  nextPresent: TState,
): HistoryState<TState> {
  if (Object.is(history.present, nextPresent)) {
    return history;
  }

  return {
    past: [...history.past, history.present],
    present: nextPresent,
    future: [],
  };
}

export function undoHistoryState<TState>(
  history: HistoryState<TState>,
): HistoryState<TState> {
  if (!canUndo(history)) {
    return history;
  }

  const previous = history.past[history.past.length - 1];

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistoryState<TState>(
  history: HistoryState<TState>,
): HistoryState<TState> {
  if (!canRedo(history)) {
    return history;
  }

  const [next, ...remainingFuture] = history.future;

  return {
    past: [...history.past, history.present],
    present: next,
    future: remainingFuture,
  };
}
