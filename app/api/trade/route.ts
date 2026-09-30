import { NextResponse } from "next/server";
import { TradeSide } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { executeTrade } from "@/lib/trading";
export async function POST(req:Request){const user=await getCurrentUser();if(!user)return NextResponse.redirect(new URL("/login",req.url),303);const form=await req.formData();const athleteId=String(form.get("athleteId")||"");const side=String(form.get("side")||"") as TradeSide;const quantity=Number(form.get("quantity"));if(!athleteId||![TradeSide.BUY,TradeSide.SELL].includes(side))return new NextResponse("Invalid trade",{status:400});try{await executeTrade(user.id,athleteId,side,quantity);return NextResponse.redirect(new URL(form.get("returnTo")?.toString()||"/market",req.url),303)}catch(e){return new NextResponse(e instanceof Error?e.message:"Trade failed",{status:400})}}
