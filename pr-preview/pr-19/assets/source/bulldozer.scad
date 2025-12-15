// Bulldozer Body
body_width = 12;
body_length = 16;
body_height = 5;

// Treads
tread_width = 3;
tread_height = 4;
tread_length = 18;

// Cabin
cabin_width = 8;
cabin_length = 8;
cabin_height = 6;

union() {
    // Chassis
    translate([-body_width/2, -body_length/2, tread_height/2])
        cube([body_width, body_length, body_height]);

    // Left Tread
    translate([-(body_width/2 + tread_width), -tread_length/2, 0])
        cube([tread_width, tread_length, tread_height]);

    // Right Tread
    translate([body_width/2, -tread_length/2, 0])
        cube([tread_width, tread_length, tread_height]);

    // Cabin
    translate([-cabin_width/2, -cabin_length/2, body_height + tread_height/2])
        cube([cabin_width, cabin_length, cabin_height]);
}
