"""Synthetic fixtures only. Separate output tree; never production fallback."""
def demo_jobs(now):
    description = ('Build accessible web interfaces for our product team. Collaborate with designers to deliver useful software. '
                   'You should have experience building and testing modern applications. Strong English communication skills are required. Cantonese is welcome.')
    return [dict(jobTitle=title, jobUrl=f'https://www.offertoday.com/en/job/DEMO-ONLY-{i}',
                 jobStatus='Active', activeEvidence='DEMO fixture, not real recruitment', verifiedAt=now.isoformat(),
                 description=description, highlights=['Build accessible interfaces', 'Collaborate with designers'],
                 salary='Not specified', experience='Not specified', workArrangement='Not specified')
            for i,title in enumerate(['DEMO Software Engineer', 'DEMO UI Designer', 'DEMO Web Developer'])]
