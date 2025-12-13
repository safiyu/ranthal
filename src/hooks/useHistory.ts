import { useState, useCallback } from "react";

interface HistoryState<T> {
    history: T[];
    index: number;
}

export function useHistory<T>(initialState: T) {
    const [state, setState] = useState<HistoryState<T>>({
        history: [initialState],
        index: 0,
    });

    const pushState = useCallback((newItem: T) => {
        setState((prev) => {
            const newHistory = prev.history.slice(0, prev.index + 1);
            return {
                history: [...newHistory, newItem],
                index: newHistory.length, // equivalent to index + 1
            };
        });
        console.log("useHistory: pushState completed. New history length:", state.history.length + 1);
    }, [state.history.length]);

    const undo = useCallback(() => {
        setState((prev) => {
            if (prev.index > 0) {
                return { ...prev, index: prev.index - 1 };
            }
            return prev;
        });
        // We can't return the new state value easily from here, but the component will re-render
    }, []);

    const redo = useCallback(() => {
        setState((prev) => {
            if (prev.index < prev.history.length - 1) {
                return { ...prev, index: prev.index + 1 };
            }
            return prev;
        });
    }, []);

    return {
        state: state.history[state.index],
        pushState,
        undo,
        redo,
        setHistory: useCallback((history: T[], index: number) => {
            setState({ history, index });
        }, []),
        canUndo: state.index > 0,
        canRedo: state.index < state.history.length - 1,
        history: state.history,
    };
}
