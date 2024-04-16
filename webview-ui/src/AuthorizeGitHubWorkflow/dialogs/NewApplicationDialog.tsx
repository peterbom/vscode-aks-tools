import { FormEvent, useState } from "react";
import { Dialog } from "../../components/Dialog";
import { VSCodeButton, VSCodeDivider, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import styles from "../AuthorizeGitHubWorkflow.module.css";
import { Maybe, isNothing, just, nothing } from "../../utilities/maybe";
import {
    Validatable,
    hasMessage,
    invalid,
    isValid,
    missing,
    orDefault,
    unset,
    valid,
} from "../../utilities/validation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";

export interface NewApplicationDialogProps {
    shown: boolean;
    existingApplicationNames: string[];
    onHidden: () => void;
    onCreate: (name: string) => void;
}

export function NewApplicationDialog(props: NewApplicationDialogProps) {
    const [applicationName, setApplicationName] = useState<Validatable<string>>(unset());

    function handleApplicationNameChange(e: Event | FormEvent<HTMLElement>) {
        const name = (e.currentTarget as HTMLInputElement).value;
        const validated = getValidatedApplicationName(name);
        setApplicationName(validated);
    }

    function getValidatedApplicationName(name: string): Validatable<string> {
        if (!name) return missing("Application name is required.");
        if (props.existingApplicationNames.includes(name)) return invalid(name, "Application name already exists.");

        return valid(name);
    }

    function validate(): Maybe<string> {
        if (!isValid(applicationName)) return nothing();

        return just(applicationName.value);
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const namespace = validate();
        if (isNothing(namespace)) {
            return;
        }

        props.onCreate(namespace.value);
    }

    return (
        <Dialog isShown={props.shown} onCancel={props.onHidden}>
            <h2>New Entra ID Application</h2>

            <form onSubmit={handleSubmit}>
                <VSCodeDivider />

                <div className={styles.inputContainer}>
                    <label htmlFor="new-application-input">Application name *</label>
                    <VSCodeTextField
                        id="new-application-input"
                        className={styles.control}
                        value={orDefault(applicationName, "")}
                        onBlur={handleApplicationNameChange}
                        onInput={handleApplicationNameChange}
                    />
                    {hasMessage(applicationName) && (
                        <span className={styles.validationMessage}>
                            <FontAwesomeIcon className={styles.errorIndicator} icon={faTimesCircle} />
                            {applicationName.message}
                        </span>
                    )}
                </div>

                <VSCodeDivider />

                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit" disabled={isNothing(validate())}>
                        Create
                    </VSCodeButton>
                    <VSCodeButton appearance="secondary" onClick={props.onHidden}>
                        Cancel
                    </VSCodeButton>
                </div>
            </form>
        </Dialog>
    );
}
