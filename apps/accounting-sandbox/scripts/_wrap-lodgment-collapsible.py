from pathlib import Path

path = Path(
    r"c:\Users\fscsq\Desktop\selpic2\apps\accounting-sandbox\components\Lodgment\ATOLodgmentGuide.tsx"
)
text = path.read_text(encoding="utf-8")

# Add collapsible import if missing
needle = "import { LodgmentCalendar }"
alt = "import { LodgmentCalendar } from '@/components/Lodgment/LodgmentCalendar'"
if "LodgmentCollapsibleSection" not in text:
    text = text.replace(
        "import { LodgmentCalendar } from '@/components/Lodgment/LodgmentCalendar'",
        "import { LodgmentCollapsibleSection } from '@/components/Lodgment/LodgmentCollapsibleSection'\n"
        "import { LodgmentCalendar } from '@/components/Lodgment/LodgmentCalendar'",
    )
    if "LodgmentCollapsibleSection" not in text:
        # try alternate quote/path styles already present
        import re
        text2, n = re.subn(
            r"import \{ LodgmentCalendar \} from '@/components/Lodgment/LodgmentCalendar'",
            "import { LodgmentCollapsibleSection } from '@/components/Lodgment/LodgmentCollapsibleSection'\n"
            "import { LodgmentCalendar } from '@/components/Lodgment/LodgmentCalendar'",
            text,
            count=1,
        )
        if n:
            text = text2
        else:
            text2, n = re.subn(
                r"import \{ LodgmentCalendar \} from \"@/components/Lodgment/LodgmentCalendar\"",
                'import { LodgmentCollapsibleSection } from "@/components/Lodgment/LodgmentCollapsibleSection"\n'
                'import { LodgmentCalendar } from "@/components/Lodgment/LodgmentCalendar"',
                text,
                count=1,
            )
            text = text2 if n else text

# Wrap LodgmentCalendar block
old_cal = """      <LodgmentCalendar
        items={calendarItems}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />"""
new_cal = """      <LodgmentCollapsibleSection
        title=\"Lodgment calendar\"
        summary=\"What to lodge, where in ATO, which SELPIC tab — expand for steps\"
        defaultOpen={false}
      >
        <LodgmentCalendar
          items={calendarItems}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
      </LodgmentCollapsibleSection>"""

if old_cal not in text:
    # try onSelectTab vs onSelectTab naming from fuzzy
    old_cal = """      <LodgmentCalendar
        items={calendarItems}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />"""
    new_cal = """      <LodgmentCollapsibleSection
        title=\"Lodgment calendar\"
        summary=\"What to lodge, where in ATO, which SELPIC tab — expand for steps\"
        defaultOpen={false}
      >
        <LodgmentCalendar
          items={calendarItems}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
      </LodgmentCollapsibleSection>"""

if old_cal in text:
    text = text.replace(old_cal, new_cal, 1)
    print("wrapped calendar")
else:
    # dump nearby for debug
    i = text.find("<LodgmentCalendar")
    print("calendar snippet:", repr(text[i : i + 180]))

# Wrap PreLodgeChecklistPanel
old_check = """      <PreLodgeChecklistPanel
        checklist={viewingSnapshot?.preLodge ?? preLodge}
        frozenLabel={
          viewingSnapshot?.preLodge
            ? `Checklist frozen at snapshot save (${new Date(viewingSnapshot.preLodge.savedAt).toLocaleString()})`
            : undefined
        }
      />"""
new_check = """      <LodgmentCollapsibleSection
        title=\"Pre-lodge checklist\"
        summary={
          (viewingSnapshot?.preLodge ?? preLodge)?.readyToLodge
            ? 'Ready to lodge — expand to review checks'
            : 'Not ready yet — expand checklist details'
        }
        defaultOpen={!(viewingSnapshot?.preLodge ?? preLodge)?.readyToLodge}
      >
        <PreLodgeChecklistPanel
          checklist={viewingSnapshot?.preLodge ?? preLodge}
          frozenLabel={
            viewingSnapshot?.preLodge
              ? `Checklist frozen at snapshot save (${new Date(viewingSnapshot.preLodge.savedAt).toLocaleString()})`
              : undefined
          }
        />
      </LodgmentCollapsibleSection>"""

if old_check in text:
    text = text.replace(old_check, new_check, 1)
    print("wrapped checklist")
else:
    i = text.find("<PreLodgeChecklistPanel")
    print("checklist snippet:", repr(text[i : i + 220]))

# Wrap period lock card: replace opening card div with collapsible, and closing
marker = "{/* Period lock & data scope"
idx = text.find(marker)
if idx < 0:
    marker = "Period lock & data scope"
    idx = text.find(marker)
print("period lock idx", idx)

path.write_text(text, encoding="utf-8")
print("wrote", path)
