# Retrozinn's Hyprland Dots
My customized Hyprland dotfiles that I keep changing time to time!

> [!warning]
> This is a work in progress, it's still not ready to use.
> Currently, I'm making the Eww configuration myself.

## Recent progress screenshots
Every widget on any of these screenshots are totally functional! Except the notification center.

<div align="center"

[!image](repo/eww_shots/desktop.png)
[!image](repo/eww_shots/control_center.png)
[!image](repo/eww_shots/audio_thing.png)
[!image](repo/eww_shots/calendar.png)
[!image](repo/eww_shots/logout_menu.png)

</div>

## 🎨 Colors
All the colors are dynamically based on the current wallpaper! This is possible by using [pywal], a cli tool to generate colorschemes by using an image as a base.

## 🖼️ Wallpapers
When you're at the [Installation](#Installation) process, you can choose to copy my dotfiles' wallpapers folder. If you chose to copy, you can change the current wallpaper by pressing <kbd>SUPER</kbd> + <kbd>W</kbd>, or clicking to change wallpaper in the Control Center.

### Source
All wallpapers inside this repo are not made by me! You can find all sources inside the [`WALLPAPERS.md`](https://github.com/retrozinndev/Hyprland-Dots/blob/ryo/WALLPAPERS.md) file.


## Installation
You'll need to have installed all needed packages before installing my dotfiles! Use your package manager to do so. See needed packages on [`Wiki/Dependencies`].

In order to install this style right away, just run this installation script:

> ℹ️ Notice: the installation script will make a backup folder containing all previous files in `~/hyprland-dots-bkp`.

> 💡 Tip: Note the `$` character means that it's recommended to run this command without root privileges.

```nushell
 $ git clone "https://github.com/retrozinndev/Hyprland-Dots.git"; cd Hyprland-Dots; bash apply.sh
```

### 🎉 Apps
- Browser: [Zen Browser]
- Text Editor: [Neovim], my config is [here](https://github.com/retrozinndev/nvim-conf.lua)
- Terminal Emulator: [Kitty]
- Shell: [Nushell]
- See more on the [wiki]!

## ❗ Issues
Having issues? Please create a [new Issue] here, I'll be happy to help you out!

## 📜 License
This repo is licensed under the [MIT License].

## 🌠 Stargazers Graph
Thanks to everyone who starred my dotfiles! 💖
[![Stargazers over time](https://starchart.cc/retrozinndev/Hyprland-Dots.svg?background=%2324292e&axis=%23fafbfc&line=%232dba4e)](https://starchart.cc/retrozinndev/Hyprland-Dots)

<!-- References of other projects -->
[pywal]: https://github.com/dylanaraps/pywal
[zen browser]: https://zen-browser.app
[neovim]: https://neovim.io
[nushell]: https://nushell.sh
[kitty]: https://sw.kovidgoyal.net/kitty/

<!--  Web refs -->
[mit license]: https://en.wikipedia.org/wiki/MIT_License

<!-- Tabs -->
[wiki]: https://github.com/retrozinndev/Hyprland-Dots/wiki
[issues]: https://github.com/retrozinndev/Hyprland-Dots/issues

<!-- Wiki Pages -->
[`wiki/dependencies`]: https://github.com/retrozinndev/Hyprland-Dots/wiki/Dependencies

<!-- Action Links -->
[new issue]: https://github.com/retrozinndev/Hyprland-Dots/issues/new
