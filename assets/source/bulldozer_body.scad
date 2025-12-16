// Bulldozer Body
body_width = 12;
body_length = 16;
body_height = 5;
tread_height = 4;

// Chassis
translate([-body_width/2, -body_length/2, tread_height/2])
    cube([body_width, body_length, body_height]);
