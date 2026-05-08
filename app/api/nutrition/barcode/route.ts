import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { openFoodFactsLookupBarcode } from "@/lib/nutrition/openfoodfacts";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode")?.trim() ?? "";
  if (!barcode) {
    return NextResponse.json({ error: "barcode is required" }, { status: 400 });
  }

  try {
    const item = await openFoodFactsLookupBarcode(barcode);
    return NextResponse.json({ item, provider: "openfoodfacts" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Barcode lookup failed",
      },
      { status: 500 },
    );
  }
}
