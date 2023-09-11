import { Uri } from "vscode";
import * as k8s from 'vscode-kubernetes-tools-api';
import { failed } from "../commands/utils/errorable";
import { MessageHandler, MessageSink } from "../webview-contract/messaging";
import { BasePanel, PanelDataProvider } from "./BasePanel";
import { invokeKubectlCommand } from "../commands/utils/kubectl";
import { InitialState, ToVsCodeMsgDef, ToWebViewMsgDef } from "../webview-contract/webviewDefinitions/kubectl";

export class KubectlPanel extends BasePanel<"kubectl"> {
    constructor(extensionUri: Uri) {
        super(extensionUri, "kubectl");
    }
}

export class KubectlDataProvider implements PanelDataProvider<"kubectl"> {
    constructor(
        readonly kubectl: k8s.APIAvailable<k8s.KubectlV1>,
        readonly kubeConfigFilePath: string,
        readonly clusterName: string,
        readonly command: string
    ) { }

    getTitle(): string {
        return `Run Kubectl on ${this.clusterName}`;
    }

    getInitialState(): InitialState {
        return {
            clusterName: this.clusterName,
            command: this.command
        };
    }

    getMessageHandler(webview: MessageSink<ToWebViewMsgDef>): MessageHandler<ToVsCodeMsgDef> {
        return {
            runCommandRequest: args => this._handleRunCommandRequest(args.command, webview)
        };
    }

    private async _handleRunCommandRequest(command: string, webview: MessageSink<ToWebViewMsgDef>) {
        const kubectlresult = await invokeKubectlCommand(this.kubectl, this.kubeConfigFilePath, command);

        if (failed(kubectlresult)) {
            webview.postMessage({
                command: "runCommandResponse", parameters: {
                    errorMessage: kubectlresult.error
                }
            });

            return;
        }

        webview.postMessage({
            command: "runCommandResponse",
            parameters: {
                output: kubectlresult.result.stdout
            }
        });
    }
}
