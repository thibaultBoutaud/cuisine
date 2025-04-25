
import { HOST } from "../host";


export async function getMyAlerts(receiverId) {
    try {
        const preRes = await fetch(`${HOST}/api/alerts/${receiverId}`, {
            method: "GET",
            credentials: 'include',
            headers: {
            },
        });
        const res = await preRes.json();
        return {
            status: preRes.status,
            ok: preRes.ok,
            data: res
        };
    } catch (err) {
        console.error(err);
    }
}
