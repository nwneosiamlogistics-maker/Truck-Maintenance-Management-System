import { Repair } from "../types";

const LINE_CHANNEL_ACCESS_TOKEN = 'ych1JeDMCl7S+l4PLKRvC9t+z0sywxVn4kqtCxz8Ap/odCT5P9in5qe1B6PyaBWw+JvbVHLBYc/oJUPYrFBRbUzskvKCbhpqeiH04alojn+P3F6jGVLexAsMBdNRduDIS4fZXMRyXryBPjLh4GACWgdB04t89/1O/w1cDnyilFU=';

/**
 * Sends a Flex Message notification via LINE Messaging API (Broadcast).
 * แจ้งเตือนไปยังทุกคนที่แอดเพื่อน LINE Official Account ของคุณ
 * เหมาะสำหรับการแจ้งเตือนภายในทีมงาน (ผู้จัดการ, ช่าง, พนักงาน)
 */
export const sendRepairStatusLineNotification = async (repair: Repair, oldStatus: string, newStatus: string) => {
    // Determine color based on new status
    let statusColor = '#333333';
    let statusText = newStatus;

    switch (newStatus) {
        case 'รอซ่อม': statusColor = '#fbbf24'; break; // Amber
        case 'กำลังซ่อม': statusColor = '#3b82f6'; break; // Blue
        case 'รออะไหล่': statusColor = '#f97316'; break; // Orange
        case 'ซ่อมเสร็จ': statusColor = '#10b981'; break; // Green
        case 'ยกเลิก': statusColor = '#ef4444'; break; // Red
    }

    const flexMessage = {
        type: "flex",
        altText: `อัปเดตสถานะงานซ่อม: ${repair.licensePlate} (${newStatus})`,
        contents: {
            "type": "bubble",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "สถานะงานซ่อม",
                        "weight": "bold",
                        "color": "#1DB446",
                        "size": "sm"
                    },
                    {
                        "type": "text",
                        "text": repair.licensePlate,
                        "weight": "bold",
                        "size": "xxl",
                        "margin": "md"
                    }
                ]
            },
            "hero": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": newStatus,
                        "size": "3xl",
                        "weight": "bold",
                        "color": "#ffffff",
                        "align": "center"
                    }
                ],
                "backgroundColor": statusColor,
                "paddingAll": "xl",
                "justifyContent": "center",
                "alignItems": "center"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "เลขที่ใบซ่อม",
                                "size": "sm",
                                "color": "#555555",
                                "flex": 1
                            },
                            {
                                "type": "text",
                                "text": repair.repairOrderNo,
                                "size": "sm",
                                "color": "#111111",
                                "align": "end",
                                "flex": 2
                            }
                        ]
                    },
                    {
                        "type": "separator",
                        "margin": "md"
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "จากสถานะ",
                                "size": "sm",
                                "color": "#555555",
                                "flex": 1
                            },
                            {
                                "type": "text",
                                "text": oldStatus,
                                "size": "sm",
                                "color": "#111111",
                                "align": "end",
                                "flex": 2
                            }
                        ],
                        "margin": "md"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": "รายละเอียด",
                                "size": "sm",
                                "color": "#555555",
                                "margin": "lg"
                            },
                            {
                                "type": "text",
                                "text": repair.problemDescription || "-",
                                "size": "sm",
                                "color": "#111111",
                                "wrap": true,
                                "margin": "sm"
                            }
                        ]
                    }
                ]
            }
        }
    };

    try {
        // Use the local proxy path '/line-api' which vite config forwards to https://api.line.me
        // Using 'broadcast' to send to all followers (team members who added the bot)
        const response = await fetch('/line-api/v2/bot/message/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                messages: [flexMessage]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send LINE notification:', errorData);
            throw new Error(`LINE API Error: ${response.statusText}`);
        }

        console.log('LINE notification sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending LINE notification:', error);
        return false;
    }
};
