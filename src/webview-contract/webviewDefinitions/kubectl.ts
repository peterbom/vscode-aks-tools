import { WebviewDefinition } from "../webviewTypes";

export interface InitialState {
    clusterName: string
    command: string
}

export type ToVsCodeMsgDef = {
    runCommandRequest: {
        command: string
    }
};

export type ToWebViewMsgDef = {
    runCommandResponse: {
        output?: string
        errorMessage?: string
    }
};

export type KubectlDefinition = WebviewDefinition<InitialState, ToVsCodeMsgDef, ToWebViewMsgDef>;
