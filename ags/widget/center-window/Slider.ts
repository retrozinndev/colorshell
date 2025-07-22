import { bind, timeout, Time, GLib } from 'astal';
import { Gtk, Gdk, Widget } from 'astal/gtk3';
import { AstalPlayers } from '../../scripts/player';
import AstalMpris from "gi://AstalMpris";
import { Wallpaper } from '../../scripts/wallpaper';

let dragTimer: (Time|null) = null;

let isDragging = false;
let dragProgress: number | null = null;
            
let pulseAnimationId: number | null = null;
let pulseValue = 0;

function drawRoundedRectangle(cr, x, y, width, height, radius) {
    radius = Math.min(radius, height / 2, width / 2);

    cr.moveTo(x + radius, y);
    cr.arc(x + width - radius, y + radius, radius, 1.5 * Math.PI, 2 * Math.PI); // Top right
    cr.arc(x + width - radius, y + height - radius, radius, 0, 0.5 * Math.PI); // Bottom right
    cr.arc(x + radius, y + height - radius, radius, 0.5 * Math.PI, Math.PI); // Bottom left
    cr.arc(x + radius, y + radius, radius, Math.PI, 1.5 * Math.PI); // Top left
    cr.closePath();
}

export function progressBar(player: AstalMpris.Player): Gtk.Widget {
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
                const length = player.get_length()
                console.log('Width', width, 'x', x, 'Len', length);
                if (width === 0) return;
                
                const newProgress = Math.max(0, Math.min(x / width, 1));

                console.log('New Progress', newProgress);
                
                if (dragProgress !== newProgress) {
                    dragProgress = newProgress;
                    //self.queue_draw();
                }
            };
            
            self.connect('button-press-event', (_, event) => {
                if (player.length > GLib.MAXINT64 / 10000000) return;
                const [success, x] = event.get_coords();

                isDragging = true;
                updateDragPosition(x);
            });

            self.connect('motion-notify-event', (_, event) => {
                if (isDragging) {
                    const [, x] = event.get_coords();
                    updateDragPosition(x);
                }
            });

            self.connect('button-release-event', () => {
                if (isDragging && dragProgress !== null && player.get_length() > 0) {
                    const finalPosition = dragProgress * player.get_length();
                    player.set_position(finalPosition)
                    timeout(70, () => isDragging = false);
                    console.log('Final Position', finalPosition, '\nLen', player.get_length(), '\nPosition', player.get_position());
                };
            });
            
            self.connect('draw', (self) => {
                if (pulseAnimationId !== null) return;

                if (player.playbackStatus === AstalMpris.PlaybackStatus.PLAYING) {
                    pulseAnimationId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, Math.round(1000 / Wallpaper.getDefault().getRefreshRate()), () => {
                            pulseValue = Math.sin((Date.now() / 1000) * Math.PI);
                            self.queue_draw();
                            return GLib.SOURCE_CONTINUE;
                        }
                    );
                }
            });

            // self.connect('draw', bind(self, (self, cr) => {
            //     console.log("Draw", self, typeof self);
            // }))

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
            const position = player.get_position();
            const length = player.get_length();
            
            const playerProgress = length > 0 ? position / length : 0;
            const displayProgress = (isDragging && dragProgress !== null) ? dragProgress : 
                (length > (GLib.MAXINT64 / 10000000) ? length : playerProgress);

            const barHeight = 6;
            const baseHandleRadius = 7;
            const handlePulseAmount = 1.5;
            const animatedHandleRadius = baseHandleRadius + (pulseValue > 0 ? pulseValue * handlePulseAmount : 0);
            const centerY = height / 2;
            const barRadius = barHeight / 2;
            const rgba = new Gdk.RGBA();

            const bg = styleContext.get_property('background-color', Gtk.StateFlags.NORMAL);
            const fg = styleContext.get_property('color', Gtk.StateFlags.NORMAL);

            const handleX = Math.max(animatedHandleRadius, Math.min(width * displayProgress, width - animatedHandleRadius));

            // Background
            rgba.parse('rgba(100, 100, 100, 0.4)');
            cr.setSourceRGBA(rgba.red, rgba.green, rgba.blue, rgba.alpha);
            drawRoundedRectangle(cr, 0, centerY - barHeight / 2, width, barHeight, barRadius);
            cr.fill();

            // Progress
            cr.save(); 

            cr.rectangle(0, 0, width * displayProgress, height);
            cr.clip();

            cr.setSourceRGBA(fg.red, fg.green, fg.blue, fg.alpha);
            drawRoundedRectangle(cr, 0, centerY - barHeight / 2, width, barHeight, barRadius);
            cr.fill();

            cr.restore();

            // Handle
            //rgba.parse('#ffffff');
            cr.setSourceRGBA(fg.red, fg.green, fg.blue, fg.alpha);
            cr.arc(handleX, centerY, animatedHandleRadius, 0, 2 * Math.PI);
            cr.fill();
        },
    });
}
