export let state = {
    currentData: [],
    hasUnsavedChanges: false,
};

export function setState(newState) {
    state = { ...state, ...newState };
}
