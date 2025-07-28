import { timeout, GLib } from 'astal';
import { Gtk, Gdk, Widget } from 'astal/gtk3';
import AstalMpris from "gi://AstalMpris";
import { Wallpaper } from '../../scripts/wallpaper';

let pauseProgress = 1; // 0 = full wave, 1 = full straight

export enum typeSliders {
    MATERIAL_EXPRESSIVE_WAVE, //For players
    MATERIAL_EXPRESSIVE_SLIDER 
}

function drawRoundedRectangleCustom(cr, x, y, width, height, options: {
    topLeft?: boolean | number | 'small';
    topRight?: boolean | number | 'small';
    bottomRight?: boolean | number | 'small';
    bottomLeft?: boolean | number | 'small';
    minRadius?: number;
}) {
    const {
        topLeft = 0,
        topRight = 0, 
        bottomRight = 0,
        bottomLeft = 0,
        minRadius = 2
    } = options;

    const calculateRadiusPercent = (height: number): number => {
        const percent = -1.5 * height + 72.5;
        return Math.max(30, Math.min(percent, 100));
    };
    
    let tl, tr, br, bl;
    
    const dynamicMaxRadiusPercent = calculateRadiusPercent(height) / 100;
    const maxRadius = height * dynamicMaxRadiusPercent;
        
    tl = topLeft === true ? maxRadius : (topLeft === 'small' ? minRadius : (topLeft || 0));
    tr = topRight === true ? maxRadius : (topRight === 'small' ? minRadius : (topRight || 0));
    br = bottomRight === true ? maxRadius : (bottomRight === 'small' ? minRadius : (bottomRight || 0));
    bl = bottomLeft === true ? maxRadius : (bottomLeft === 'small' ? minRadius : (bottomLeft || 0));
    
    const maxR = Math.min(width / 2, height / 2);
    tl = Math.min(tl, maxR);
    tr = Math.min(tr, maxR);
    br = Math.min(br, maxR);
    bl = Math.min(bl, maxR);
    
    cr.moveTo(x + tl, y);
    
    // Top rigth
    if (tr > 0) {
        cr.arc(x + width - tr, y + tr, tr, 1.5 * Math.PI, 2 * Math.PI);
    } else {
        cr.lineTo(x + width, y);
    }
    
    // Bottom rigth
    if (br > 0) {
        cr.arc(x + width - br, y + height - br, br, 0, 0.5 * Math.PI);
    } else {
        cr.lineTo(x + width, y + height);
    }
    
    // Bottom left
    if (bl > 0) {
        cr.arc(x + bl, y + height - bl, bl, 0.5 * Math.PI, Math.PI);
    } else {
        cr.lineTo(x, y + height);
    }
    
    // Top left
    if (tl > 0) {
        cr.arc(x + tl, y + tl, tl, Math.PI, 1.5 * Math.PI);
    } else {
        cr.lineTo(x, y);
        cr.lineTo(x + tl, y);
    }
    
    cr.closePath();
}

export function createSlider(model: {
    // TO DO: 
    // ADD ICON IN SLIDER, 
    // ADD STEPS 
    getValue(): number;
    getMaxValue(): number;
    setValue(value: number): void;
    getColor(): string | (() => string | null);
    typeSlider(): typeSliders;
    iconName?(): string | (() => string | null);
    realtimeChangeValue?(): boolean;
    getPlaybackStatus?(): AstalMpris.PlaybackStatus;
    setSliderHeight?(): number;
    extraSetup?(): () => { }; 
}): Gtk.Widget {
    let isDragging = false;
    let dragProgress: number | null = null;

    const InRealTime = model.realtimeChangeValue ? model.realtimeChangeValue() : true;

    const isStreamPlaying = model.getMaxValue() >= GLib.MAXINT64 / 10000000;

    const iconSize = model.setSliderHeight ? model.setSliderHeight() - 4 : 11;
    const iconNameRaw = model.iconName;
    const iconName = typeof iconNameRaw === 'function' ? iconNameRaw() : iconNameRaw;

    const iconImage = iconName
        ? new Gtk.Image({
            icon_name: iconName,
            pixel_size: iconSize,
            halign: Gtk.Align.START,
            valign: Gtk.Align.CENTER,
            margin_start: 14,
        })
        : null;

    const drawingArea = new Widget.DrawingArea({
        className: "slider-drawing-area",
        hexpand: true,
        heightRequest: model.setSliderHeight 
            ? (model.setSliderHeight() < 15) ? model.setSliderHeight() * 2 : model.setSliderHeight() * 1.5
            : 25,

        setup: (self) => {
            self.add_events(
                Gdk.EventMask.BUTTON_PRESS_MASK |
                Gdk.EventMask.BUTTON_RELEASE_MASK |
                Gdk.EventMask.POINTER_MOTION_MASK
            );

            const updateDragPosition = (x: number) => {
                const width = self.get_allocated_width();
                if (width === 0) return;
                dragProgress = Math.max(0, Math.min(x / width, 1));
            };

            // TO DO: 
            // ADD ANIMATION OF TRANSITION FROM END POSITION TO START POSITION,
            // ADD CLASSIFICATION OF PRESSED BUTTON (PRIMARY & SECONDARY)
            self.connect('button-press-event', (_, event) => {
                if (isStreamPlaying) return;
                isDragging = true;
                const [, x] = event.get_coords();
                updateDragPosition(x);
            });

            self.connect('motion-notify-event', (_, event) => {
                if (isDragging) {
                    const [, x] = event.get_coords();
                    updateDragPosition(x);

                    if (InRealTime && dragProgress !== null) model.setValue(dragProgress * model.getMaxValue());
                }
            });

            self.connect('button-release-event', () => {
                if (isDragging && dragProgress !== null) {
                    const maxValue = model.getMaxValue();
                    if (maxValue > 0) {
                        model.setValue(dragProgress * maxValue);
                    }

                    isDragging = model.getPlaybackStatus ? timeout(40, () => { isDragging = false }) : false;
                }
            });


            let drawLoopId: number | null = null;

            self.connect('realize', () => {
                if (drawLoopId === null) {
                    // 16 ms is about 60 fps, so if you want get more fps, use this formula: Math.round(1000 / RefreshRate)
                    const FramesInMilliseconds = Math.round(1000 / Wallpaper.getDefault().getRefreshRate());
                    drawLoopId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, FramesInMilliseconds, () => {
                        if (self.get_window()?.is_visible()) {
                            self.queue_draw();
                        }
                        return GLib.SOURCE_CONTINUE;
                    });
                }
            });

            self.connect('draw', (self) => {
                if (model.typeSlider() === typeSliders.MATERIAL_EXPRESSIVE_WAVE) {
                    const playbackStatus = model.getPlaybackStatus ? model.getPlaybackStatus() : null;
                    if (playbackStatus === AstalMpris.PlaybackStatus.PLAYING && !isDragging) {
                        if (pauseProgress > 0) {
                            pauseProgress = Math.max(0, pauseProgress - 0.03);
                        }
                    } else {
                        if (pauseProgress < 1) {
                            pauseProgress = Math.min(1, pauseProgress + 0.03);
                        }
                    }
                }
            });

            self.connect("destroy", () => {
                if (drawLoopId !== null) {
                    GLib.source_remove(drawLoopId);
                    drawLoopId = null;
                }
            });
        },

        onDraw: (self, cr) => {
            const styleContext = self.get_style_context();
            const width = self.get_allocated_width();
            const height = self.get_allocated_height();

            const position = model.getValue();
            const length = model.getMaxValue();

            const currentProgress = length > 0 ? position / length : 0;
            const displayProgress = (isDragging && dragProgress !== null)
                ? dragProgress
                : (!isStreamPlaying
                    ? currentProgress
                    : 1); //1 - Max

            const styleType = model.typeSlider();
            const fg = styleContext.get_property('color', Gtk.StateFlags.NORMAL);
            const rawColor = model.getColor;
            const colorStr = typeof rawColor === 'function' ? rawColor() : rawColor;
            const color = new Gdk.RGBA();
            if (colorStr) color.parse(colorStr);

            switch (styleType) {
                case typeSliders.MATERIAL_EXPRESSIVE_SLIDER: {
                    const barHeight = model.setSliderHeight ? model.setSliderHeight() : 15;
                    const centerY = height / 2;
                    const progressX = width * displayProgress;

                    const handleWidth = 5;
                    const handleHeight = Math.max(barHeight + handleWidth * 2, Math.min(height - barHeight, barHeight + barHeight / 2));
                    const handleX = Math.max(0, Math.min(progressX - handleWidth / 2, width - handleWidth));
                    const handleOffset = 5;
                    const activeEndX = handleX - handleOffset;
                    const inactiveStartX = handleX + handleWidth + handleOffset;

                    const rawIconName = model.iconName;
                    const iconName = typeof rawIconName === 'function' ? rawIconName() : rawIconName;
                    const colorToUse = colorStr ? color : fg;

                    // Mask
                    cr.save();
                    drawRoundedRectangleCustom(
                        cr,
                        0, centerY - barHeight / 2,
                        width, barHeight,
                        { topLeft: true, topRight: true, bottomRight: true, bottomLeft: true }
                    );
                    cr.clip();

                    // Active line
                    if (displayProgress > 0 && activeEndX > 0) {
                        cr.setSourceRGBA(colorToUse.red, colorToUse.green, colorToUse.blue, colorToUse.alpha);
                        drawRoundedRectangleCustom(
                            cr,
                            0, centerY - barHeight / 2,
                            Math.max(0, activeEndX), barHeight,
                            { topLeft: true, topRight: 'small', bottomLeft: true, bottomRight: 'small' }
                        );
                        cr.fill();
                    }

                    // Unactive line
                    const hasInactive = displayProgress < 1 && inactiveStartX < width;
                    if (hasInactive) {
                        const inactiveWidth = width - inactiveStartX;
                        if (inactiveWidth > 0) {
                            cr.setSourceRGBA(fg.red, fg.green, fg.blue, 0.3);
                            drawRoundedRectangleCustom(
                                cr, 
                                inactiveStartX, centerY - barHeight / 2, 
                                inactiveWidth, barHeight, 
                                { topLeft: 'small', topRight: true, bottomLeft: 'small', bottomRight: true }
                            );
                            cr.fill();
                        }
                    }

                    // Icon
                    // Hm...
                    // if (iconName) {
                    //     const iconSize = barHeight - 4;
                    //     const iconPadding = 14;
                    //     let pixbuf;
                    //     try {
                    //         pixbuf = Gtk.IconTheme.get_default().load_icon(iconName, iconSize, Gtk.IconLookupFlags.FORCE_SIZE);
                    //         if (pixbuf) {
                    //             Gdk.cairo_set_source_pixbuf(cr, pixbuf, iconPadding, centerY - iconSize / 2);
                    //             cr.paint();
                    //         }
                    //     } catch (e) {
                    //         console.log(`Failed to load icon '${iconName}': ${e}`);
                    //     }
                    // }

                    // Max Value Dot
                    if (hasInactive) {
                        //const dotRadius = barHeight / 6;
                        const dotRadius = 2.5;
                        //const dotX = width - barHeight / 2;
                        const dotX = width - dotRadius * 2;
                        //const colorToUse = colorStr ? color : fg;

                        cr.save();
                        drawRoundedRectangleCustom(
                            cr,
                            inactiveStartX, centerY - barHeight / 2,
                            width - inactiveStartX, barHeight,
                            { topLeft: false, topRight: true, bottomRight: true, bottomLeft: false }
                        );
                        cr.clip();

                        cr.setSourceRGBA(colorToUse.red, colorToUse.green, colorToUse.blue, colorToUse.alpha);
                        cr.copyPath();
                        cr.arc(dotX, centerY, dotRadius, 0, 2 * Math.PI);
                        cr.fill();
                        cr.restore();
                    }

                    // Drop the mask
                    cr.restore();

                    // Draw on top of all surfaces
                    cr.setSourceRGBA(fg.red, fg.green, fg.blue, fg.alpha);
                    drawRoundedRectangleCustom(
                        cr,
                        handleX, centerY - handleHeight / 2,
                        handleWidth, handleHeight,
                        { topLeft: true, topRight: true, bottomRight: true, bottomLeft: true }
                    );
                    cr.fill();

                    break;
                }
                case typeSliders.MATERIAL_EXPRESSIVE_WAVE: {
                    const lineThickness = 6;
                            
                    const baseWaveAmp = 3;
                    const waveAmp = baseWaveAmp * (1 - pauseProgress);
                    const waveFreq = 0.15;
                    const time = Date.now() * 0.003;

                    const rectangleHandleWidth = 5;
                    const rectangleHandleHeight = 20;
                    const rectangleHandleX = Math.max(0, Math.min(width * displayProgress - (rectangleHandleWidth / 2), width - rectangleHandleWidth));

                    const centerY = height / 2;
                    const progressX = width * displayProgress;
                    const startX = lineThickness / 2;
                    const activeEndX = Math.max(startX, progressX - rectangleHandleWidth * 2);

                    const radius = 10;

                    cr.setLineWidth(lineThickness);
                    cr.setLineCap(1); // ROUND caps

                    // Active line (wave or line)
                    if (activeEndX > startX) {
                        const src = colorStr ? color : fg;
                        cr.setSourceRGBA(src.red, src.green, src.blue, src.alpha);

                        cr.newPath();
                        cr.moveTo(startX, centerY + Math.sin(startX * waveFreq + time) * waveAmp);
                        for (let x = startX; x < activeEndX; x++) {
                            const y = centerY + Math.sin(x * waveFreq + time) * waveAmp;
                            cr.lineTo(x, y);
                        }
                        cr.stroke();
                    }

                    // Unactive line
                    const inactiveStartX = Math.max(lineThickness * 2, Math.min(width, progressX + rectangleHandleWidth * 2));
                    if (inactiveStartX < width - startX) {
                        cr.setSourceRGBA(fg.red, fg.green, fg.blue, 0.3);
                        cr.newPath();
                        cr.moveTo(inactiveStartX, centerY);
                        cr.lineTo(width - startX, centerY);
                        cr.stroke();
                    }

                    // Handle
                    if (!isStreamPlaying) {
                        cr.setSourceRGBA(fg.red, fg.green, fg.blue, fg.alpha);
                        drawRoundedRectangleCustom(
                            cr, 
                            rectangleHandleX, 
                            centerY - rectangleHandleHeight / 2, 
                            rectangleHandleWidth, 
                            rectangleHandleHeight, 
                            { topLeft: true, topRight: true, bottomRight: true, bottomLeft: true }
                        );
                        cr.fill();
                    }
                    break;
                }
            }
        }
    } as Widget.DrawingAreaProps)

    return drawingArea;
}
