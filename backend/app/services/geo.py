"""Bali areas and approximate driving times in minutes (to be replaced by a maps API later)."""
AREAS = ["Ubud", "Penestanan", "Bangli", "Gianyar", "Bedulu", "Tampaksiring", "Tabanan", "Karangasem", "Badung", "Denpasar"]
_T = {
 ("Ubud","Penestanan"):10, ("Ubud","Bangli"):18, ("Ubud","Gianyar"):25, ("Ubud","Bedulu"):10, ("Ubud","Tampaksiring"):35,
 ("Ubud","Tabanan"):90, ("Ubud","Karangasem"):75, ("Ubud","Badung"):60, ("Ubud","Denpasar"):45,
 ("Bangli","Gianyar"):25, ("Bangli","Tampaksiring"):30, ("Bangli","Karangasem"):55, ("Tabanan","Badung"):60,
 ("Badung","Denpasar"):25, ("Denpasar","Gianyar"):35, ("Karangasem","Gianyar"):50, ("Penestanan","Bangli"):25,
}
def travel_min(a: str, b: str) -> int:
    if a == b: return 5
    return _T.get((a, b)) or _T.get((b, a)) or 60

def travel_label(m: int) -> str:
    if m <= 6: return f"{m} min walk"
    h, mm = divmod(m, 60)
    if h and mm: return f"{h} h {mm} min drive"
    if h: return f"{h} h drive"
    return f"{m} min drive"
