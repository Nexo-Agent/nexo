---
sidebar_position: 1
slug: /user-guide/installation
---

# Installation

Nexo is available for macOS, Windows, and Linux. Choose your operating system below for detailed installation instructions.

## macOS

### Prerequisites

- macOS 12 Monterey or later.

### Installation Steps

1. **Download the DMG**: Go to our [Releases Page](https://github.com/magiskboy/nexo/releases) and download the `.dmg` file for your architecture:
   - `Nexo_x.x.x_aarch64.dmg` (Apple Silicon M1/M2/M3)
   - `Nexo_x.x.x_x64.dmg` (Intel)

2. **Mount the Disk Image**: Double-click the downloaded `.dmg` file.

3. **Drag to Applications**: Drag the "Nexo" icon into the "Applications" folder.

   ![Drag to Applications](https://placehold.co/600x400?text=Drag+to+Applications+Screenshot)

4. **Launch the App**: Open your Applications folder and click on Nexo.

### Gatekeeper Warning

If you see a warning saying "Nexo cannot be opened because the developer cannot be verified" or "it is from an unidentified developer":

1. Click **Cancel** on the warning dialog.
2. Go to **System Settings** > **Privacy & Security**.
3. Scroll down to the **Security** section.
4. You should see a message about Nexo being blocked. Click **Open Anyway**.
   ![Security Settings](https://placehold.co/600x400?text=Security+Settings+Screenshot)
5. Click **Open** in the confirmation dialog.

## Windows

### Prerequisites

- Windows 10 or Windows 11.
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Usually pre-installed).

### Installation Steps

1. **Download the MSI**: Download the `.msi` installer from the [Releases Page](https://github.com/magiskboy/nexo/releases).
2. **Run Installer**: Double-click the `.msi` file.
3. **Follow Wizard**: Follow the installation wizard prompts.
   ![Windows Installer](https://placehold.co/600x400?text=Windows+Installer+Screenshot)
4. **Launch**: Nexo will launch automatically after installation.

## Linux

### AppImage (Recommended)

1. Download the `.AppImage` file.
2. Make it executable:
   ```bash
   chmod +x Nexo_x.x.x_amd64.AppImage
   ```
3. Run it:
   ```bash
   ./Nexo_x.x.x_amd64.AppImage
   ```

### Debian/Ubuntu (.deb)

1. Download the `.deb` file.
2. Install using `apt` or `dpkg`:
   ```bash
   sudo apt install ./nexo_x.x.x_amd64.deb
   ```
