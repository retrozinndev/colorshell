import { timeout, GLib } from 'astal';
import { Gtk, Gdk, Widget } from 'astal/gtk3';
import AstalMpris from "gi://AstalMpris";
import { Wallpaper } from '../../scripts/wallpaper';
            
let pulseAnimationId: number | null = null;
let pulseValue = 0;

export interface SliderOptions {
    getValue(): number;
    getMaxValue(): number;
    setValue(value: number): void;
    realtimeChangeValue(): boolean;
    getPlaybackStatus?(): AstalMpris.PlaybackStatus;
}

function drawRoundedRectangle(cr, x, y, width, height, radius) {
    radius = Math.min(radius, height / 2, width / 2);

    cr.moveTo(x + radius, y);
    cr.arc(x + width - radius, y + radius, radius, 1.5 * Math.PI, 2 * Math.PI); // Top right
    cr.arc(x + width - radius, y + height - radius, radius, 0, 0.5 * Math.PI); // Bottom right
    cr.arc(x + radius, y + height - radius, radius, 0.5 * Math.PI, Math.PI); // Bottom left
    cr.arc(x + radius, y + radius, radius, Math.PI, 1.5 * Math.PI); // Top left
    cr.closePath();
}

export function createUnifiedSlider(model: SliderOptions): Gtk.Widget {
    let isDragging = false;
    let dragProgress: number | null = null;

    return new Widget.DrawingArea({
        className: "progress-drawing-area",
        hexpand: true,
        heightRequest: 30,

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

            self.connect('button-press-event', (_, event) => {
                if (model.getMaxValue() > GLib.MAXINT64 / 10000000) return;
                isDragging = true;
                const [, x] = event.get_coords();
                updateDragPosition(x);
            });

            self.connect('motion-notify-event', (_, event) => {
                if (isDragging) {
                    const [, x] = event.get_coords();
                    updateDragPosition(x);

                    if (model.realtimeChangeValue() && dragProgress !== null) model.setValue(dragProgress * model.getMaxValue());
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

            self.connect('draw', (self) => {
                self.queue_draw();

                const playbackStatus = model.getPlaybackStatus ? model.getPlaybackStatus() : null;

                if (playbackStatus === AstalMpris.PlaybackStatus.PLAYING) {
                    if (pulseAnimationId === null) {
                        const fpm = Math.round(1000 / Wallpaper.getDefault().getRefreshRate());
                        pulseAnimationId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, fpm, () => {
                            pulseValue = Math.sin((Date.now() / 1000) * Math.PI);
                            return GLib.SOURCE_CONTINUE;
                        });
                    }
                }
            });

            self.connect("destroy", () => {
                if (pulseAnimationId !== null) {
                    GLib.source_remove(pulseAnimationId);
                    pulseAnimationId = null;
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
                : (model.getMaxValue() > (GLib.MAXINT64 / 10000000) 
                    ? model.getMaxValue() 
                    : currentProgress);

            const barHeight = 6;
            const baseHandleRadius = 7;
            const handlePulseAmount = 1.5;
            const animatedHandleRadius = baseHandleRadius + (pulseValue > 0 ? pulseValue * handlePulseAmount : 0);
            const centerY = height / 2;
            const barRadius = barHeight / 2;

            const fg = styleContext.get_property('color', Gtk.StateFlags.NORMAL);
            const handleX = Math.max(animatedHandleRadius, Math.min(width * displayProgress, width - animatedHandleRadius));
                    
            // 1. Background
            cr.setSourceRGBA(fg.red, fg.green, fg.blue, 0.3);
            drawRoundedRectangle(cr, 0, centerY - barHeight / 2, width, barHeight, barRadius);
            cr.fill();

            // 2. Progress
            cr.save();
            cr.rectangle(0, 0, width * displayProgress, height);

            cr.clip();
            cr.setSourceRGBA(fg.red, fg.green, fg.blue, fg.alpha);
            drawRoundedRectangle(cr, 0, centerY - barHeight / 2, width, barHeight, barRadius);
            cr.fill();

            cr.restore();

            // 3. Dot-Handle
            cr.setSourceRGBA(fg.red, fg.green, fg.blue, fg.alpha);
            cr.arc(handleX, centerY, animatedHandleRadius, 0, 2 * Math.PI);
            cr.fill();
        }
    });
}
