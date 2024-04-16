import { FormEvent } from "react";
import { Dialog } from "../../components/Dialog";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import styles from "../AuthorizeGitHubWorkflow.module.css";

export interface DeleteApplicationDialogProps {
    shown: boolean;
    applicationName: string;
    onHidden: () => void;
    onDelete: () => void;
}

export function DeleteApplicationDialog(props: DeleteApplicationDialogProps) {
    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        props.onDelete();
    }

    return (
        <Dialog isShown={props.shown} onCancel={props.onHidden}>
            <h2>Delete Entra ID Application</h2>

            <form onSubmit={handleSubmit}>
                <VSCodeDivider />

                <p>
                    Are you sure you want to delete the application <strong>{props.applicationName}</strong>?
                </p>

                <VSCodeDivider />

                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit">Delete</VSCodeButton>
                    <VSCodeButton appearance="secondary" onClick={props.onHidden}>
                        Cancel
                    </VSCodeButton>
                </div>
            </form>
        </Dialog>
    );
}
