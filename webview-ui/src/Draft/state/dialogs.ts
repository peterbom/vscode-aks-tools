import {
    SavedClusterDefinition,
    SavedRepositoryDefinition,
    SavedService,
    Subscription,
} from "../../../../src/webview-contract/webviewDefinitions/draft";

type DialogResourceContentDefinition = {
    cluster: SavedClusterDefinition;
    repository: SavedRepositoryDefinition;
    service: SavedService;
    subscription: { subscription: Subscription };
};

export type DialogResource = Extract<keyof DialogResourceContentDefinition, string>;

export type AllDialogsState = {
    [P in DialogResource as `${P}State`]: {
        shown: boolean;
        content: Partial<DialogResourceContentDefinition[P]>;
    };
};

type AllDialogsStateKey = Extract<keyof AllDialogsState, string>;

export type DialogState<T extends DialogResource> = AllDialogsState[`${T}State`];

export type DialogVisibilityValue = {
    [P in DialogResource]: {
        dialog: P;
        shown: boolean;
    };
}[DialogResource];

export type DialogContent<T extends DialogResource> = DialogResourceContentDefinition[T];

export type DialogContentValue = {
    [P in DialogResource]: {
        dialog: P;
        content: Partial<DialogResourceContentDefinition[P]>;
    };
}[DialogResource];

export function updateDialogVisibility(
    allDialogsState: AllDialogsState,
    visibilityValue: DialogVisibilityValue,
): AllDialogsState {
    const stateKey: AllDialogsStateKey = `${visibilityValue.dialog}State`;
    const dialogState = allDialogsState[stateKey];
    return {
        ...allDialogsState,
        [stateKey]: { ...dialogState, shown: visibilityValue.shown },
    };
}

export function updateDialogContent(allDialogsState: AllDialogsState, stateValue: DialogContentValue): AllDialogsState {
    const stateKey: AllDialogsStateKey = `${stateValue.dialog}State`;
    const dialogState = allDialogsState[stateKey];
    return {
        ...allDialogsState,
        [stateKey]: { ...dialogState, content: stateValue.content },
    };
}
