# Retrozinn's Hyprland Dots
My Hyprland dotfiles that I keep improving almost everyday! 🤩 (i love doing this) <br>

> [!note]
> This is very work in progress, it's an Aylur's GTK Shell version of my dots! I absolutely <br>
> don't recommend installing this one, since it's WIP.
> If you're searching for the stable dotfiles, go to the [`ryo`](https://github.com/retrozinndev/Hyprland-Dots/tree/ryo) branch! <br>

## ❓ Why
These dotfiles includes a desktop shell I made with [GTK] using [Astal] and [AGS] + [TypeScript]. It took me a lot of time to make this, so please star the repo if you like it! :star:

### ✔️ What's included in this shell
- Super pretty Bar, Control Center and Clock Window(with calendar and media controller)
- Notifications with support for actions + History
- Internationalization(i18n, see [🌐 Internationalization](#-internationalization) for available languages)
- Bluetooth + Network Controllers
- Bluetooth device management inside Control Center itself
- Runner with support for plugins ([anyrun](https://github.com/anyrun-org/anyrun)-like)
- Super cool media controller
- Gnome-like application runner(the fullscreen one)
- Support for multiple monitors

## 🔘 TODO
- More Control Center Tiles:
  - Screen Recording
  - Night Light
- Per-app Volume(low priority)
- Maybe a settings app in the future? ✨

## 🌄 Screenshots
![Kitty](repo/shots/kitty.png)
![Widgets](repo/shots/widgets.png)
![Control Center](repo/shots/runner-plugin.png)
![Neovim](repo/shots/neovim.png)

## 🎨 Colors
All the colors of the interface are dynamically generated from your wallpaper! This is possible by using [pywal16] (fork of pywal), a cli tool to generate color schemes on the fly.

## 🖼️ Wallpapers
When you're at the [Installation](#Installation) process, you can choose whether to install the wallpapers. Or if you haven't, you can just create a directory `~/wallpapers` in your home `~` and put images you want to use as wallpapers!

You can select any of the images inside `~/wallpapers` by pressing <kbd>SUPER</kbd> + <kbd>W</kbd> or by accessing the Control Center and clicking in the image icon on top.
## :keyboard: Binds
You can see pre-configured bindings in the [Wiki/Bindings] page!

### ℹ️ Source
All wallpapers inside this repo are not made by me! You can find all sources inside the [`WALLPAPERS.md`](https://github.com/retrozinndev/Hyprland-Dots/blob/ryo/WALLPAPERS.md) file.

## 🌐 Internationalization
This Shell supports i18n. Currently, it supports the following languages: 
- English (United States), maintained by [@retrozinndev](https://github.com/retrozinndev)
- Português (Brasil), maintained by [@retrozinndev](https://github.com/retrozinndev)
  
Don't see your language here? You can contribute and make translations too! <br>
To do so, fork this repository, translate your fork, then open a pull request to this repository, simple as that!

## ⚙️ Installation
See the Installation Guide on [Wiki/Installation].

## 🎉 Tools
- Browser: [Zen Browser]
- Text Editor: [Neovim], my config is [here](https://github.com/retrozinndev/nvim-conf.lua)
- Terminal Emulator: [Kitty]
- Shell: [Nushell]
- See more on the [wiki]!

## ❗ Issues
Having issues? Please create a [new Issue] here, I'll be happy to help you out!

## 📜 License
This repo is licensed under the [MIT License].

## 🌠 Stargazers
Thanks to everyone who starred my project! 💖
[![Stargazers over time](https://starchart.cc/retrozinndev/Hyprland-Dots.svg?background=%2324292e&axis=%23fafbfc&line=%232dba4e)](https://starchart.cc/retrozinndev/Hyprland-Dots)

<!-- References of other projects -->
[pywal16]: https://github.com/eylles/pywal16
[zen browser]: https://zen-browser.app
[neovim]: https://neovim.io
[nushell]: https://nushell.sh
[kitty]: https://sw.kovidgoyal.net/kitty
[ags]: https://aylur.github.io/ags
[astal]: https://aylur.github.io/astal
[typescript]: https://typescriptlang.org

<!--  Web refs -->
[mit license]: https://en.wikipedia.org/wiki/MIT_License

<!-- Tabs -->
[wiki]: https://github.com/retrozinndev/Hyprland-Dots/wiki
[issues]: https://github.com/retrozinndev/Hyprland-Dots/issues

<!-- Wiki Pages -->
[wiki/dependencies]: https://github.com/retrozinndev/Hyprland-Dots/wiki/Dependencies
[wiki/usage]: https://github.com/retrozinndev/Hyprland-Dots/wiki/Usage
[wiki/installation]: https://github.com/retrozinndev/Hyprland-Dots/wiki/Installation
[wiki/bindings]: https://github.com/retrozinndev/Hyprland-Dots/wiki/Bindings

<!-- Actions -->
[new issue]: https://github.com/retrozinndev/Hyprland-Dots/issues/new
