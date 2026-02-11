export async function loadFontDynamically(fontFamily: string, fontUrl: string) {
    try {
        const FontFaceCtor = (window as any).FontFace;
        if (!FontFaceCtor || !(document as any).fonts?.add) {
            return false;
        }

        const font = new FontFaceCtor(fontFamily, `url(${fontUrl})`);

        await font.load();
        (document as any).fonts.add(font);
        // console.log(`Loaded dynamic font: ${fontFamily}`);
        return true;
    } catch (err) {
        console.error("Failed to load font:", fontFamily, fontUrl, err);
        return false;
    }
}
