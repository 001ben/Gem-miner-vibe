
import matplotlib.pyplot as plt
import numpy as np
import os

def generate_plot():
    levels = np.arange(1, 21)

    # Physics Parameters
    base_density = 0.002
    density_growth = 0.0001

    base_size = 40
    size_growth = 5

    base_power = 0.012
    power_exponent = 1.25

    # Calculations
    density = base_density + (levels * density_growth)
    size = base_size + (levels * size_growth)
    volume = size * size # Approximated 2D volume/area
    mass = volume * density

    power = base_power * (power_exponent ** levels)

    # F = ma -> a = F/m
    # Assuming Force proportional to Power for this plot
    acceleration = power / mass

    # Plotting
    fig, ax1 = plt.subplots(figsize=(10, 6))

    color = 'tab:red'
    ax1.set_xlabel('Level')
    ax1.set_ylabel('Mass', color=color)
    ax1.plot(levels, mass, color=color, linestyle='--', label='Mass')
    ax1.tick_params(axis='y', labelcolor=color)

    ax2 = ax1.twinx()
    color = 'tab:blue'
    ax2.set_ylabel('Acceleration Force', color=color)
    ax2.plot(levels, acceleration, color=color, linewidth=2, label='Acceleration')
    ax2.tick_params(axis='y', labelcolor=color)

    plt.title('Bulldozer Physics Scaling: Mass vs. Acceleration')
    fig.tight_layout()

    output_path = 'docs/assets/progression_plot.png'
    plt.savefig(output_path)
    print(f"Generated {output_path}")

if __name__ == "__main__":
    generate_plot()
