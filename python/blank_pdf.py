from reportlab.pdfgen import canvas
from utils import temp_output, print_result

out = temp_output(".pdf")
c = canvas.Canvas(out)
c.showPage()
c.save()
print_result(out, "blank.pdf")
