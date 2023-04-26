import { fs } from './fs';
const tmp = require('tmp');

export async function withOptionalTempFile<T>(
    content: string,
    fileType: string,
    fn: (filename: string) => Promise<T>): Promise<T> {
    const tempFile = tmp.fileSync({ prefix: "aks-periscope-", postfix: `.${fileType}` });
    await fs.writeFile(tempFile.name, content);

    try {
        return await fn(tempFile.name);
    } finally {
        tempFile.removeCallback();
    }
}

export async function createTempFile(
    content: string,
    fileType: string): Promise<string> {
    const tempFile = tmp.fileSync({ prefix: "aks-kubectl-ai-", postfix: `.${fileType}` });
    await fs.writeFile(tempFile.name, content);

    return tempFile.name;
}

