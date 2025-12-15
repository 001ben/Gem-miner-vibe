// Variables for easy tweaking
width = 10;
height = 4;
curve_depth = 2;
tooth_count = 6;

difference() {
    // Main curved blade (Intersection of a cube and a cylinder)
    intersection() {
        translate([-width/2, 0, 0])
            cube([width, height, curve_depth * 2]);

        translate([0, height/2, curve_depth])
            rotate([0, 90, 0])
            cylinder(h=width + 2, r=height * 1.5, center=true, $fn=60);
    }

    // Cut out "wear" or details here
}

// Add Teeth
for (i = [0 : tooth_count-1]) {
    x_pos = -width/2 + (width / (tooth_count-1)) * i;
    translate([x_pos, 0, curve_depth])
        rotate([45, 0, 0])
        cube([0.5, 1.5, 1], center=true);
}
