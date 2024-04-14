import { LanguageInfo } from "../../../src/webview-contract/webviewDefinitions/draft/types";

const supportedLanguages: LanguageInfo[] = [
    {
        name: "javascript",
        displayName: "JavaScript",
        exampleVersions: ["19", "18", "16", "14", "12", "10"],
        defaultPort: 3000,
        versionDescription: "Node.js version",
        getDefaultRuntimeImageTag: (version) => version,
    },
    {
        name: "go",
        displayName: "Go",
        exampleVersions: ["1.20", "1.19", "1.18", "1.17", "1.16", "1.15"],
        defaultPort: 8080,
        getDefaultRuntimeImageTag: (version) => version,
    },
    {
        name: "python",
        displayName: "Python",
        exampleVersions: ["3.11", "3.10", "3.9", "3.8", "3.7", "3.6"],
        defaultPort: 8000,
        getDefaultRuntimeImageTag: (version) => `${version}-slim`,
    },
    {
        name: "php",
        displayName: "PHP",
        exampleVersions: ["8.2", "8.1", "8.0", "7.4", "7.3", "7.2", "7.1"],
        getDefaultBuilderImageTag: (version) => (parseInt(version.split(".")[0]) >= 8 ? "2.5" : "2.2"),
        getDefaultRuntimeImageTag: (version) => `${version}-apache`,
    },
    {
        name: "java",
        displayName: "Java",
        exampleVersions: ["19", "17", "11", "8"],
        defaultPort: 8080,
        versionDescription: "Java version",
        getDefaultBuilderImageTag: (version) => `3-eclipse-temurin-${version}`,
        getDefaultRuntimeImageTag: (version) => `${version}-jre`,
    },
    {
        name: "csharp",
        displayName: "C#",
        exampleVersions: ["7.0", "6.0", "5.0", "4.0", "3.1"],
        defaultPort: 5000,
        getDefaultRuntimeImageTag: (version) => version,
    },
    {
        name: "ruby",
        displayName: "Ruby",
        exampleVersions: ["3.1.2", "3.1.3", "3.0.5", "2.7.7", "2.6", "2.5", "2.4"],
        defaultPort: 3000,
        getDefaultRuntimeImageTag: (version) => version,
    },
    {
        name: "rust",
        displayName: "Rust",
        exampleVersions: ["1.70", "1.67", "1.66", "1.65", "1.64", "1.63", "1.62", "1.54", "1.53"],
        defaultPort: 8000,
        getDefaultRuntimeImageTag: (version) => `${version}-slim`,
    },
    {
        name: "swift",
        displayName: "Swift",
        exampleVersions: ["5.7", "5.6", "5.5", "5.4", "5.3", "5.2", "5.1", "5.0", "4.2"],
        defaultPort: 8080,
        getDefaultRuntimeImageTag: (version) => `${version}-slim`,
    },
    {
        name: "clojure",
        displayName: "Clojure",
        exampleVersions: ["19", "17", "11", "8"],
        defaultPort: 3000,
        versionDescription: "Java version",
        getDefaultRuntimeImageTag: (version) => `${version}-jdk-alpine`,
    },
    {
        name: "erlang",
        displayName: "Erlang",
        exampleVersions: ["25.2", "24.3", "23.3", "22.3", "21.3", "20.3"],
        defaultPort: 0,
        getDefaultBuilderImageTag: (version) => `${version}-alpine`,
        getDefaultRuntimeImageTag: () => "3.15",
    },
    {
        name: "gradle",
        displayName: "Gradle",
        exampleVersions: ["19", "17", "11", "8"],
        defaultPort: 8080,
        versionDescription: "Java version",
        getDefaultBuilderImageTag: (version) => `jdk${version}`,
        getDefaultRuntimeImageTag: (version) => `${version}-jre`,
    },
    {
        name: "gradlew",
        displayName: "Gradle Wrapper",
        exampleVersions: ["19", "17", "11", "8"],
        defaultPort: 8080,
        versionDescription: "Java version",
        getDefaultBuilderImageTag: (version) => `jdk${version}`,
        getDefaultRuntimeImageTag: (version) => `${version}-jre`,
    },
    {
        name: "gomodule",
        displayName: "GoModule",
        exampleVersions: ["1.20", "1.19", "1.18", "1.17", "1.16", "1.15"],
        defaultPort: 0,
        versionDescription: "Go version",
        getDefaultRuntimeImageTag: (version) => version,
    },
];

export function getSupportedLanguages(): LanguageInfo[] {
    return supportedLanguages;
}
