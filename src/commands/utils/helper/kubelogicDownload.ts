import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as download from '../download/download';
import * as path from 'path';
import {combine, Errorable, failed, succeeded} from '../errorable';
import {shell} from '../.././utils/shell';

const {exec} = require('child_process');

export interface KubeloginConfig {
    releaseTag: string;
 }

export function runCommand(command: string): string {
   const cmdRun = exec(command).stdout;

   return cmdRun;
}

export function baseInstallFolder(): string {
   return path.join(os.homedir(), `.vs-kubernetes/tools`);
}

async function getLatestKubeloginReleaseTag() {
   const kubeloginConfig = getKubeloginConfig();
   if (failed(kubeloginConfig)) {
      vscode.window.showErrorMessage(kubeloginConfig.error);
      return undefined;
   }

   return kubeloginConfig.result.releaseTag;
}

function checkIfKubeloginBinaryExist(destinationFile: string): boolean {
   return fs.existsSync(destinationFile);
}

export async function downloadKubeloginBinary() {
   // 0. Get latest release tag.
   // 1: check if file already exist.
   // 2: if not Download latest.
   const latestReleaseTag = await getLatestKubeloginReleaseTag();

   if (!latestReleaseTag) {
      return;
   }

   const kubeloginBinaryFile = getKubeloginFileName();

   // example latest release location: https://github.com/Azure/kubelogin/releases/tag/v0.0.20
   const destinationFile = path.join(
      baseInstallFolder(),
      latestReleaseTag,
      kubeloginBinaryFile
   );

   if (checkIfKubeloginBinaryExist(destinationFile)) {
      return {succeeded: true};
   }

   const kubeloginDownloadUrl = `https://github.com/Azure/kubelogin/releases/download/${latestReleaseTag}/${kubeloginBinaryFile}.zip`;
   const downloadResult = await download.once(
      kubeloginDownloadUrl,
      destinationFile
   );

   if (failed(downloadResult)) {
      return {
         succeeded: false,
         error: [`Failed to download kubelogin binary: ${downloadResult.error[0]}`]
      };
   }
   const decompress = require("decompress");

   decompress(destinationFile, path.join(baseInstallFolder(), latestReleaseTag))
    .catch((error: any) => {
        return {
            succeeded: false,
            error: [`Failed to unzip kubelogin binary: ${error}`]
         };
    });

   //If linux check -- make chmod 0755
   fs.chmodSync(destinationFile, '0755');
   return succeeded(downloadResult);
}

function getKubeloginFileName() {
   let architecture = os.arch();
   const operatingSystem = os.platform().toLocaleLowerCase();

   if (architecture === 'x64') {
      architecture = 'amd64';
   }
   let kubeloginBinaryFile = `kubelogin-${operatingSystem}-${architecture}`;

   if (operatingSystem === 'win32') {
      // Kubelogin release v0.0.22 the file name has exe associated with it.
      kubeloginBinaryFile = `kubelogin-${operatingSystem}-${architecture}.exe`;
   }

   return kubeloginBinaryFile;
}

export async function runKubeloginCommand(
   command: string
): Promise<[string, string]> {
   const latestReleaseTag = await getLatestKubeloginReleaseTag();
   if (!latestReleaseTag) {
      return ['', ''];
   }
   const kubeloginBinaryFile = getKubeloginFileName();
   const destinationBinaryFile = path.join(
      baseInstallFolder(),
      latestReleaseTag,
      kubeloginBinaryFile
   );
   const runCommandOutput = await shell.exec(
      `${destinationBinaryFile} ${command}`
   );

   if (failed(runCommandOutput)) {
      return ['', ''];
   }

   return [runCommandOutput.result.stdout, runCommandOutput.result.stderr];
}

export function getKubeloginConfig(): Errorable<KubeloginConfig> {
   const kubeloginConfig = vscode.workspace.getConfiguration('azure.kubelogin');
   const props = combine([getConfigValue(kubeloginConfig, 'releaseTag')]);

   if (failed(props)) {
      return {
         succeeded: false,
         error: `Failed to readazure.kubelogin configuration: ${props.error}`
      };
   }

   const config = {
      releaseTag: props.result[0]
   };

   return {succeeded: true, result: config};
}

function getConfigValue(
   config: vscode.WorkspaceConfiguration,
   key: string
): Errorable<string> {
   const value = config.get(key);
   if (value === undefined) {
      return {succeeded: false, error: `${key} not defined.`};
   }
   const result = value as string;
   if (result === undefined) {
      return {
         succeeded: false,
         error: `${key} value has type: ${typeof value}; expected string.`
      };
   }
   return {succeeded: true, result: result};
}
