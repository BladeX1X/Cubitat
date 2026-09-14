# ExchangePreferencesSummary

Resumen reutilizable de lo que busca el anunciante de una permuta.

- Lee defensivamente `features.exchangePreferences` mediante `getExchangePreferences`.
- Presenta tipo, zona, dormitorios, área, diferencia monetaria y notas solamente cuando existan.
- La ficha pública usa la presentación destacada y moderación usa `compact` dentro del detalle expandido.
- Si el JSON es antiguo, incompleto o malformado, no renderiza la sección y no interrumpe la página.
