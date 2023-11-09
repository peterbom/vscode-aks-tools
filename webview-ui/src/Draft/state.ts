import { InitialState } from "../../../src/webview-contract/webviewDefinitions/draft";
import { WebviewStateUpdater } from "../utilities/state";
import { getWebviewMessageContext } from "../utilities/vscode";

export type EventDef = {};

export type DraftState = InitialState & {
    selectedService: string | null
};

export const stateUpdater: WebviewStateUpdater<"draft", EventDef, DraftState> = {
    createState: initialState => ({
        ...initialState,
        selectedService: initialState.services.length === 1 ? initialState.services[0].appName : null
    }),
    vscodeMessageHandler: {},
    eventHandler: {}
};

export const vscode = getWebviewMessageContext<"draft">({});