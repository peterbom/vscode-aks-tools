import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import styles from "./Kubectl.module.css";
import { FormEvent, useState } from "react";
import { getWebviewMessageContext } from "../utilities/vscode";
import { AIKeyStatus } from "../../../src/webview-contract/webviewDefinitions/kubectl";

type ChangeEvent = Event | FormEvent<HTMLElement>;

export interface OpenAIOutputProps {
    explanation: string | null
    isExplanationStreaming: boolean
    aiKeyStatus: AIKeyStatus
    invalidAIKey: string | null
    onUpdateAPIKey: (apiKey: string) => void
}

export function OpenAIOutput(props: OpenAIOutputProps) {
    const vscode = getWebviewMessageContext<"kubectl">();

    const [apiKey, setApiKey] = useState<string>("");

    function handleAPIKeyChange(e: ChangeEvent) {
        const input = e.currentTarget as HTMLInputElement;
        setApiKey(input.value);
    }

    function handleUpdateClick() {
        vscode.postMessage({ command: "updateAIKeyRequest", parameters: {apiKey} });
        props.onUpdateAPIKey(apiKey);
    }

    const canUpdate = apiKey && apiKey.trim() && apiKey.trim() !== props.invalidAIKey;
    const needsNewAIKey = props.aiKeyStatus === AIKeyStatus.Missing || props.aiKeyStatus === AIKeyStatus.Invalid;

    return (
        <>
            {needsNewAIKey && (
                <div>
                    {props.aiKeyStatus === AIKeyStatus.Invalid && <p>OpenAI API Key is invalid</p>}
                    {props.aiKeyStatus === AIKeyStatus.Missing && <p>OpenAI API Key is not set</p>}
                    <label htmlFor="api-key-input">API Key:</label>
                    <VSCodeTextField id="api-key-input" value={apiKey} onInput={handleAPIKeyChange} />
                    <VSCodeButton disabled={!canUpdate} onClick={handleUpdateClick}>{props.invalidAIKey ? 'Update' : 'Set'}</VSCodeButton>
                </div>
            )}
            {props.explanation && <pre className={styles.explanation}>{props.explanation}</pre>}
        </>
    )
}