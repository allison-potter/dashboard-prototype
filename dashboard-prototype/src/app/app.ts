import { TitleCasePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

type InventoryStatus = 'healthy' | 'watch' | 'urgent';
type ViewMode = 'category' | 'supplier' | 'facility';

interface ReserveProduct {
  name: string;
  sku: string;
  facility: string;
  totalUnits: number;
  availableToday: number;
  daysRemaining: number;
  resetDate: string;
}

interface ReserveProgram {
  category: string;
  program: string;
  supplier: string;
  earningWindow: string;
  nextAccrual: string;
  products: ReserveProduct[];
}

interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  tone: InventoryStatus;
}

interface BreakdownDetail {
  productName: string;
  category: string;
  supplier: string;
  facility: string;
  totalUnits: number;
  availableToday: number;
  daysRemaining: number;
  resetDate: string;
}

interface BreakdownRow {
  name: string;
  totalUnits: number;
  availableToday: number;
  expiringSoon: number;
  resetDate: string;
  facilities: number;
  suppliers: number;
  products: number;
  status: InventoryStatus;
  details: BreakdownDetail[];
}

@Component({
  selector: 'app-root',
  imports: [TitleCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly generatedOn = 'April 15, 2026';
  readonly organizationName = 'North Valley Integrated Health';
  readonly reserveMemberSince = 'January 15, 2020';
  readonly currentView = signal<ViewMode>('category');
  readonly viewModes: ViewMode[] = ['category', 'supplier', 'facility'];
  readonly expandedRows = signal<string[]>([]);
  readonly selectedFilters = signal<string[]>([]);
  readonly filterMenuOpen = signal(false);

  readonly reservePrograms = signal<ReserveProgram[]>([
    {
      category: 'Contrast Media',
      program: 'Imaging Growth Reserve',
      supplier: 'GE HealthCare',
      earningWindow: 'Quarterly accrual',
      nextAccrual: 'Apr 30, 2026',
      products: [
        {
          name: 'Omnipaque 350 100mL',
          sku: 'CM-OM350-100',
          facility: 'North Valley Medical Center',
          totalUnits: 168,
          availableToday: 64,
          daysRemaining: 18,
          resetDate: 'May 3, 2026'
        },
        {
          name: 'Visipaque 320 50mL',
          sku: 'CM-VI320-50',
          facility: 'North Valley East Surgery Center',
          totalUnits: 104,
          availableToday: 28,
          daysRemaining: 42,
          resetDate: 'May 27, 2026'
        }
      ]
    },
    {
      category: 'Respiratory Disposables',
      program: 'Critical Care Flex Reserve',
      supplier: 'Medtronic',
      earningWindow: 'Monthly accrual',
      nextAccrual: 'Apr 22, 2026',
      products: [
        {
          name: 'Shiley Tracheostomy Tube 6CN75H',
          sku: 'RD-SH6CN75H',
          facility: 'North Valley Medical Center',
          totalUnits: 220,
          availableToday: 96,
          daysRemaining: 11,
          resetDate: 'Apr 26, 2026'
        },
        {
          name: 'DAR Ventilator Circuit Adult',
          sku: 'RD-DAR-ADULT',
          facility: 'North Valley West Critical Care',
          totalUnits: 180,
          availableToday: 52,
          daysRemaining: 23,
          resetDate: 'May 8, 2026'
        }
      ]
    },
    {
      category: 'Medication Delivery',
      program: 'Infusion Assurance Reserve',
      supplier: 'ICU Medical',
      earningWindow: 'Quarterly accrual',
      nextAccrual: 'May 15, 2026',
      products: [
        {
          name: 'Plum Set Standard Bore',
          sku: 'MD-PLUM-SB',
          facility: 'North Valley East Surgery Center',
          totalUnits: 310,
          availableToday: 148,
          daysRemaining: 37,
          resetDate: 'May 22, 2026'
        },
        {
          name: 'Clave Needlefree Connector',
          sku: 'MD-CLAVE-NC',
          facility: 'North Valley Infusion Pavilion',
          totalUnits: 260,
          availableToday: 118,
          daysRemaining: 57,
          resetDate: 'Jun 11, 2026'
        }
      ]
    },
    {
      category: 'Surgical Essentials',
      program: 'Perioperative Continuity Reserve',
      supplier: 'Cardinal Health',
      earningWindow: 'Monthly accrual',
      nextAccrual: 'Apr 28, 2026',
      products: [
        {
          name: 'Surgical Gown AAMI Level 3',
          sku: 'SE-GOWN-L3',
          facility: 'North Valley Medical Center',
          totalUnits: 420,
          availableToday: 120,
          daysRemaining: 9,
          resetDate: 'Apr 24, 2026'
        },
        {
          name: 'Procedure Pack General OR',
          sku: 'SE-ORPACK-GEN',
          facility: 'North Valley East Surgery Center',
          totalUnits: 150,
          availableToday: 44,
          daysRemaining: 31,
          resetDate: 'May 16, 2026'
        }
      ]
    }
  ]);

  readonly summaryMetrics = computed<DashboardMetric[]>(() => {
    const programs = this.reservePrograms();
    const products = programs.flatMap((program) => program.products);
    const totalUnits = this.sum(products, 'totalUnits');
    const availableToday = this.sum(products, 'availableToday');
    const expiringSoon = products
      .filter((product) => product.daysRemaining <= 14)
      .reduce((total, product) => total + product.availableToday, 0);
    const nextResetProduct = [...products].sort((left, right) => left.daysRemaining - right.daysRemaining)[0];

    return [
      {
        label: 'Total reserve inventory',
        value: this.formatUnits(totalUnits),
        detail: 'All units earned across reserve programs',
        tone: 'healthy'
      },
      {
        label: 'Available today',
        value: this.formatUnits(availableToday),
        detail: `${this.formatPercent(availableToday / totalUnits)} of total reserve can be ordered now`,
        tone: 'healthy'
      },
      {
        label: 'Use before reset',
        value: this.formatUnits(expiringSoon),
        detail: `${products.filter((product) => product.daysRemaining <= 14).length} product balances expire in the next 14 days`,
        tone: expiringSoon > 200 ? 'urgent' : 'watch'
      },
      {
        label: 'Next reset',
        value: `${nextResetProduct.daysRemaining} days`,
        detail: `${nextResetProduct.name} resets on ${nextResetProduct.resetDate}`,
        tone: nextResetProduct.daysRemaining <= 10 ? 'urgent' : 'watch'
      }
    ];
  });

  readonly filterOptions = computed<string[]>(() => {
    const options = new Set<string>();

    for (const program of this.reservePrograms()) {
      if (this.currentView() === 'category') {
        options.add(program.category);
      } else if (this.currentView() === 'supplier') {
        options.add(program.supplier);
      } else {
        for (const product of program.products) {
          options.add(product.facility);
        }
      }
    }

    return [...options].sort((left, right) => left.localeCompare(right));
  });

  readonly filterLabel = computed(() => {
    const selections = this.selectedFilters();

    if (selections.length === 0) {
      return `All ${this.getViewLabel(this.currentView(), true)}`;
    }

    if (selections.length === 1) {
      return selections[0];
    }

    return `${selections.length} selected`;
  });

  readonly breakdownRows = computed<BreakdownRow[]>(() => {
    const groups = new Map<string, { program: ReserveProgram; product: ReserveProduct }[]>();

    for (const program of this.reservePrograms()) {
      for (const product of program.products) {
        if (!this.matchesFilter(program, product)) {
          continue;
        }

        const key = this.getGroupKey(program, product, this.currentView());
        const current = groups.get(key) ?? [];
        current.push({ program, product });
        groups.set(key, current);
      }
    }

    return [...groups.entries()]
      .map(([name, entries]) => {
        const totalUnits = entries.reduce((total, entry) => total + entry.product.totalUnits, 0);
        const availableToday = entries.reduce((total, entry) => total + entry.product.availableToday, 0);
        const expiringSoon = entries
          .filter((entry) => entry.product.daysRemaining <= 14)
          .reduce((total, entry) => total + entry.product.availableToday, 0);
        const daysRemaining = Math.min(...entries.map((entry) => entry.product.daysRemaining));
        const resetDate = entries
          .slice()
          .sort((left, right) => left.product.daysRemaining - right.product.daysRemaining)[0].product.resetDate;
        const details = entries
          .map(({ program, product }) => ({
            productName: product.name,
            category: program.category,
            supplier: program.supplier,
            facility: product.facility,
            totalUnits: product.totalUnits,
            availableToday: product.availableToday,
            daysRemaining: product.daysRemaining,
            resetDate: product.resetDate
          }))
          .sort((left, right) => right.availableToday - left.availableToday);

        return {
          name,
          totalUnits,
          availableToday,
          expiringSoon,
          resetDate,
          facilities: new Set(entries.map((entry) => entry.product.facility)).size,
          suppliers: new Set(entries.map((entry) => entry.program.supplier)).size,
          products: new Set(entries.map((entry) => entry.product.sku)).size,
          status: this.getStatus(daysRemaining, expiringSoon),
          details
        };
      })
      .sort((left, right) => right.availableToday - left.availableToday);
  });

  setView(mode: ViewMode): void {
    this.currentView.set(mode);
    this.expandedRows.set([]);
    this.selectedFilters.set([]);
    this.filterMenuOpen.set(false);
  }

  setViewFromEvent(event: Event): void {
    this.setView((event.target as HTMLSelectElement).value as ViewMode);
  }

  toggleRow(name: string): void {
    this.expandedRows.update((rows) =>
      rows.includes(name) ? rows.filter((row) => row !== name) : [...rows, name]
    );
  }

  expandAllRows(): void {
    this.expandedRows.set(this.breakdownRows().map((row) => row.name));
  }

  collapseAllRows(): void {
    this.expandedRows.set([]);
  }

  toggleFilterMenu(): void {
    this.filterMenuOpen.update((open) => !open);
  }

  closeFilterMenu(): void {
    this.filterMenuOpen.set(false);
  }

  toggleFilter(option: string): void {
    this.selectedFilters.update((filters) =>
      filters.includes(option) ? filters.filter((filter) => filter !== option) : [...filters, option]
    );
    this.expandedRows.set([]);
  }

  clearFilters(): void {
    this.selectedFilters.set([]);
    this.expandedRows.set([]);
  }

  isFilterSelected(option: string): boolean {
    return this.selectedFilters().includes(option);
  }

  isExpanded(name: string): boolean {
    return this.expandedRows().includes(name);
  }

  trackByLabel(_: number, item: DashboardMetric): string {
    return item.label;
  }

  trackByName(_: number, item: BreakdownRow): string {
    return item.name;
  }

  trackByDetail(_: number, item: BreakdownDetail): string {
    return `${item.productName}-${item.facility}`;
  }

  formatUnits(value: number): string {
    return `${new Intl.NumberFormat('en-US').format(value)} units`;
  }

  formatPercent(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      maximumFractionDigits: 0
    }).format(value);
  }

  formatShortDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }).format(new Date(value));
  }

  private sum<T>(items: T[], key: keyof T): number {
    return items.reduce((total, item) => total + Number(item[key]), 0);
  }

  private getGroupKey(program: ReserveProgram, product: ReserveProduct, mode: ViewMode): string {
    switch (mode) {
      case 'category':
        return program.category;
      case 'supplier':
        return program.supplier;
      case 'facility':
        return product.facility;
    }
  }

  private matchesFilter(program: ReserveProgram, product: ReserveProduct): boolean {
    const filters = this.selectedFilters();

    if (filters.length === 0) {
      return true;
    }

    if (this.currentView() === 'category') {
      return filters.includes(program.category);
    }

    if (this.currentView() === 'supplier') {
      return filters.includes(program.supplier);
    }

    return filters.includes(product.facility);
  }

  private getViewLabel(view: ViewMode, plural = false): string {
    const labels: Record<ViewMode, [string, string]> = {
      category: ['Category', 'Categories'],
      supplier: ['Supplier', 'Suppliers'],
      facility: ['Facility', 'Facilities']
    };

    return labels[view][plural ? 1 : 0];
  }

  private getStatus(daysRemaining: number, expiringUnits: number): InventoryStatus {
    if (daysRemaining <= 10 || expiringUnits >= 120) {
      return 'urgent';
    }

    if (daysRemaining <= 21 || expiringUnits > 0) {
      return 'watch';
    }

    return 'healthy';
  }
}
