// Bulldozer Tracks
body_width = 12;
tread_width = 3;
tread_height = 4;
tread_length = 18;

union() {
    // Left Tread
    translate([-(body_width/2 + tread_width), -tread_length/2, 0])
        cube([tread_width, tread_length, tread_height]);

    // Right Tread
    translate([body_width/2, -tread_length/2, 0])
        cube([tread_width, tread_length, tread_height]);
}
