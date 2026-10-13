# Ajustar la luz

![Las propiedades de una luminaria](/screenshots/es/luminaire-inspector.png)

- **Atenuación:** cuánto da la luminaria, de 0 a 100 %.
- **Temperatura de color:** de 2200 K, cálida, a 6500 K, fría. Empieza en la
  del producto.
- **⏻:** la enciende o apaga sin perder la atenuación.
- **Producto:** potencia, flujo luminoso, temperatura nominal y apertura del
  haz, según el fabricante.

## Luminarias con archivo IES

Los productos con un **archivo IES** (en la demo, los que dicen "(IES)")
usan la distribución de luz real que midió el fabricante: hacia dónde va
la luz, cuánta va para arriba, si es simétrica o no. Los demás se estiman a
partir del flujo y de la apertura del haz.

## Sombras

Las **8 luminarias que más iluminan** proyectan sombras. Las demás iluminan
igual, pero sin sombras, para que todo siga fluido.
