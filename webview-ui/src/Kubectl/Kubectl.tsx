import { VSCodeDivider, VSCodeProgressRing, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { InitialState } from "../../../src/webview-contract/webviewDefinitions/kubectl";
import styles from "./Kubectl.module.css";
import { getWebviewMessageContext } from "../utilities/vscode";
import { useEffect, useState } from "react";

interface KubectlState {
    command: string
    commandSent: boolean
    output?: string
    errorMessage?: string
}

export function Kubectl(props: InitialState) {
    const vscode = getWebviewMessageContext<"kubectl">();

    const [state, setState] = useState<KubectlState>({
        command: props.command,
        commandSent: false
    });

    useEffect(() => {
        vscode.subscribeToMessages({
            runCommandResponse: args => setState({...state, output: args.output, errorMessage: args.errorMessage})
        });
    });

    useEffect(() => {
        if (!state.commandSent) {
            setState({...state, commandSent: true});
            vscode.postMessage({ command: "runCommandRequest", parameters: {command: state.command} });
        }
    });

    const hasOutput = state.output !== undefined;
    const hasError = state.errorMessage !== undefined;
    const isAwaitingResponse = !hasOutput && !hasError;

    return (
    <>
        <h2>Kubectl Command Run for {props.clusterName}</h2>
        <VSCodeDivider />
        <div className={styles.inputContainer}>
            <label htmlFor="command-input" className={styles.label}>Command</label>
            <VSCodeTextField readOnly id="command-input" className={styles.control} value={props.command} />
        </div>
        <VSCodeDivider />
        {isAwaitingResponse && <VSCodeProgressRing />}
        {hasOutput && <pre>{state.output}</pre>}
        {hasError && <pre className={styles.error}>{state.errorMessage}</pre>}
    </>
    );
}