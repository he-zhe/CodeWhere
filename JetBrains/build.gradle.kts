plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.12.0"
}

group = "dev.codewhere"
version = "0.1.0"

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
        intellijIdeaCommunity("2024.2.5") {
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
            sinceBuild = "242"
        }
    }

    pluginVerification {
        ides {
            create("IC", "2024.2.5") {
                useInstaller = false
            }
            create("IC", "2025.2.6.1") {
                useInstaller = false
            }
        }
    }
}

tasks {
    wrapper {
        gradleVersion = "9.4.1"
    }
}
