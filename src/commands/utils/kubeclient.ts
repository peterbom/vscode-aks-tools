import { Exec, KubeConfig, V1Status } from '@kubernetes/client-node'
import { fromEvent } from 'rxjs';
import { EventEmitter, Writable } from 'stream';
import { Errorable, getErrorMessage, success } from './errorable';
import { OutputStream } from './commands';

export async function streamExecOutput(
    kubeconfig: string,
    namespace: string,
    podName: string,
    containerName: string,
    remoteCommand: string[]
): Promise<Errorable<OutputStream>> {
    const kc = new KubeConfig();
    kc.loadFromString(kubeconfig);

    const emitter = new EventEmitter();

    // Create a `Writable` which emits content line-by-line,
    // ensuring only complete (ending in a newline character)
    // lines are emitted.
    let lastPartialLine = "";
    const stdoutWritable = new Writable({
        write(chunk: Buffer, _encoding, callback) {
            let chunkStr = lastPartialLine + chunk.toString();
            let newlineIndex = chunkStr.indexOf('\n');
            while (newlineIndex >= 0) {
                const line = chunkStr.substring(0, newlineIndex);
                emitter.emit('write', line);
                chunkStr = chunkStr.substring(newlineIndex + 1);
                newlineIndex = chunkStr.indexOf('\n');
            }
            lastPartialLine = chunkStr;

            callback();
        }
    });

    try {
        const exec = new Exec(kc);
        const websocket = await exec.exec(
            namespace, podName, containerName, remoteCommand,
            stdoutWritable,
            null /* stderr */,
            null /* stdin */,
            false /* tty */,
            (status: V1Status) => {
                console.log('Exited with status:');
                console.log(JSON.stringify(status, null, 2));
            }
        );
    
        const lines = fromEvent(emitter, 'write', (...args) => args[0] as string);
        const outputStream = new OutputStream(() => websocket.close(), lines);
    
        return success(outputStream)
    } catch (e) {
        return { succeeded: false, error: getErrorMessage(e) };
    }
}
