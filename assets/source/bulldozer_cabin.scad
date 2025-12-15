// Bulldozer Cabin
body_width = 12;
body_length = 16;
body_height = 5;
tread_height = 4;

cabin_width = 8;
cabin_length = 8;
cabin_height = 6;

// Cabin
translate([-cabin_width/2, -cabin_length/2, body_height + tread_height/2])
    cube([cabin_width, cabin_length, cabin_height]);
