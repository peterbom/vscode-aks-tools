import {
    FilePickerOptions,
    FilePickerResult,
} from "../../../../src/webview-contract/webviewDefinitions/shared/fileSystemTypes";

export class TestDialogEvents extends EventTarget {
    notifyFilePickerResult(result: FilePickerResult | null) {
        this.dispatchEvent(new CustomEvent("fileSystemItemPicked", { detail: result }));
    }

    onPickFileRequest(handler: (options: FilePickerOptions) => void) {
        this.addEventListener("filePickerLaunchRequested", (e) => {
            const customEvent = e as CustomEvent;
            const options = customEvent.detail as FilePickerOptions;
            handler(options);
        });
    }

    async pickFile(options: FilePickerOptions): Promise<FilePickerResult | null> {
        let handler: (item: FilePickerResult | null) => void;
        const listener: EventListener = (e) => {
            const result = (e as CustomEvent).detail as FilePickerResult | null;
            if (handler) {
                handler(result);
            }
        };

        const promise = new Promise<FilePickerResult | null>((resolve) => {
            handler = resolve;
        });

        this.addEventListener("fileSystemItemPicked", listener);
        this.dispatchEvent(new CustomEvent("filePickerLaunchRequested", { detail: options }));

        const result = await promise;
        this.removeEventListener("fileSystemItemPicked", listener);
        return result;
    }
}
