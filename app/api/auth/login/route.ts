import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
export async function POST(req:Request){const form=await req.formData();const email=String(form.get("email")||"");const password=String(form.get("password")||"");const user=await prisma.user.findUnique({where:{email}});if(!user||!(await bcrypt.compare(password,user.passwordHash)))return new NextResponse("Invalid credentials",{status:401});await createSession(user.id);return NextResponse.redirect(new URL("/market",req.url),303)}
