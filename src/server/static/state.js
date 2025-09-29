export let state = {
    currentCsvData: [],
    currentCsvFile: '',
    hasUnsavedChanges: false,
    csvFiles: [],
};

export function setState(newState) {
    state = { ...state, ...newState };
}
