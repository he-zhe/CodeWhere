plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.12.0"
}

group = "dev.codewhere"
version = "0.1.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()

    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2025.2.6.1") {
            useInstaller = false
        }
    }
}

intellijPlatform {
    pluginConfiguration {
        name = "CodeWhere"
        version = project.version.toString()
        description = "Deterministic, local editor-context capture for IntelliJ-based IDEs."

        ideaVersion {
            sinceBuild = "252"
        }
    }
}

tasks {
    wrapper {
        gradleVersion = "9.4.1"
    }
}
