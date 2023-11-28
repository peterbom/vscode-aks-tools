import { FormEvent } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef } from "./state";
import { Maybe, isNothing, just, nothing } from "../utilities/maybe";
import { SavedService } from "../../../src/webview-contract/webviewDefinitions/draft";
import { DialogState } from "./state/dialogs";

type ChangeEvent = Event | FormEvent<HTMLElement>;

export interface NewServiceDialogProps {
    state: DialogState<"service">;
    existingNames: string[];
    eventHandlers: EventHandlers<EventDef>;
}

export function NewServiceDialog(props: NewServiceDialogProps) {
    const existingNameExists = Object.fromEntries(props.existingNames.map((name) => [name, true]));

    function validate(): Maybe<SavedService> {
        const name = (props.state.content.name || "").trim();
        if (name.length === 0) return nothing();
        if (existingNameExists[name]) return nothing();

        const path = (props.state.content.path || "").trim();

        return just({
            name,
            path,
            buildConfig: null,
            deploymentSpec: null,
            gitHubWorkflow: null,
        });
    }

    function handleNameChange(e: ChangeEvent) {
        const input = e.currentTarget as HTMLInputElement;
        const content: Partial<SavedService> = { ...props.state.content, name: input.value };
        props.eventHandlers.onSetDialogContent({ dialog: "service", content });
    }

    function handlePickPathClick() {}

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const service = validate();
        if (isNothing(service)) {
            return;
        }

        props.eventHandlers.onCreateNewService(service.value);
    }

    return (
        <Dialog
            isShown={props.state.shown}
            onCancel={() => props.eventHandlers.onSetDialogVisibility({ dialog: "service", shown: false })}
        >
            <h2>New Service</h2>

            <form onSubmit={handleSubmit}>
                <VSCodeDivider />

                <div className={styles.inputContainer}>
                    <label htmlFor="name-input" className={styles.label}>
                        Name
                    </label>
                    <VSCodeTextField
                        id="name-input"
                        className={styles.midControl}
                        value={props.state.content.name || ""}
                        onInput={handleNameChange}
                    />

                    <label htmlFor="path-value" className={styles.label}>
                        Path
                    </label>
                    <span id="path-value">./{props.state.content.path || ""}</span>

                    <VSCodeButton appearance="secondary" onClick={handlePickPathClick}>
                        Pick
                    </VSCodeButton>
                </div>

                <VSCodeDivider />

                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit" disabled={isNothing(validate())}>
                        Create
                    </VSCodeButton>
                    <VSCodeButton
                        appearance="secondary"
                        onClick={() => props.eventHandlers.onSetDialogVisibility({ dialog: "service", shown: false })}
                    >
                        Cancel
                    </VSCodeButton>
                </div>
            </form>
        </Dialog>
    );
}
