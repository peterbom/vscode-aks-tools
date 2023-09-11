import { MessageHandler } from "../../../src/webview-contract/messaging";
import { InitialState, ToVsCodeMsgDef } from "../../../src/webview-contract/webviewDefinitions/kubectl";
import { Kubectl } from "../Kubectl/Kubectl";
import { Scenario } from "../utilities/manualTest";
import { getTestVscodeMessageContext } from "../utilities/vscode";

const sampleGetPodsOutput = `
NAMESPACE       NAME                                  READY   STATUS    RESTARTS        AGE
testing         test-pod-dgqd5                        1/1     Running   0               3d21h
testing         test-pod--ffxtr                       1/1     Running   0               3d21h
prod            website-c5hsq                         1/1     Running   0               19d
prod            website-pwghh                         1/1     Running   1 (5d13h ago)   19d
`;

export function getKubectlScenarios() {
    const clusterName = "test-cluster";
    const initialState: InitialState = {
        clusterName,
        command: "get pods -A"
    }

    const webview = getTestVscodeMessageContext<"kubectl">();

    function getMessageHandler(succeeding: boolean): MessageHandler<ToVsCodeMsgDef> {
        return {
            runCommandRequest: args => handleRunCommandRequest(args.command, succeeding)
        }
    }

    async function handleRunCommandRequest(_command: string, succeeding: boolean) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (succeeding) {
            webview.postMessage({
                command: "runCommandResponse",
                parameters: {
                    output: sampleGetPodsOutput
                }
            });
        } else {
            webview.postMessage({
                command: "runCommandResponse",
                parameters: {
                    errorMessage: "Something went wrong and this is the error."
                }
            });
        }
    }

    return [
        Scenario.create(`Kubectl (succeeding)`, () => <Kubectl {...initialState} />).withSubscription(webview, getMessageHandler(true)),
        Scenario.create(`Kubectl (failing)`, () => <Kubectl {...initialState} />).withSubscription(webview, getMessageHandler(false))
    ];
}
