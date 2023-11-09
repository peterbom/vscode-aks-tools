import styles from "./Draft.module.css";
import { VSCodeButton, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { InitialState } from "../../../src/webview-contract/webviewDefinitions/draft";
import { getStateManagement } from "../utilities/state";
import { stateUpdater, vscode } from "./state";
import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

export function Draft(initialState: InitialState) {
    const {state, eventHandlers, vsCodeMessageHandlers} = getStateManagement(stateUpdater, initialState);

    useEffect(() => {
        vscode.subscribeToMessages(vsCodeMessageHandlers);
    });

    return (
    <>
        <h2>Draft for {state.workspaceName}</h2>
        <div className={styles.inputContainer}>
            {state.services.length === 0 && (
            <>
                <p className={styles.fullWidth}>
                    <FontAwesomeIcon className={styles.infoIndicator} icon={faInfoCircle} />
                    You have not configured any services for your workspace.
                    If {state.workspaceName} contains code for one or more services for deployment to a Kubernetes cluster,
                    click below to allow Draft to configure them.
                </p>
                <VSCodeButton>Create Service</VSCodeButton>
            </>
            )}
            {state.services.length > 0 && (
            <>
                <label htmlFor="service-dropdown" className={styles.label}>Service</label>
                <VSCodeDropdown value={state.selectedService || undefined} id="service-dropdown">
                    {state.services.length > 1 && <VSCodeOption value="">Select</VSCodeOption>}
                    {state.services.map(s => (
                        <VSCodeOption key={s.appName} value={s.appName}>{s.appName}</VSCodeOption>
                    ))}
                </VSCodeDropdown>
            </>
            )}
        </div>
    </>
    );
}